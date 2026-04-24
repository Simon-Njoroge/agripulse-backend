import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../users/entities/user.entity';
import { Session } from '../sessions/entities/session.entity';
import { LoginDto, SignupDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  
  async signup(signupDto: SignupDto) {
    const { email, password, name, role } = signupDto;

   
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password,
      name,
      role: role || UserRole.AGENT,
      isActive: true,
    });

    await this.userRepository.save(user);

   
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      message: 'User registered successfully',
      user: userWithoutPassword,
    };
  }

  
  async login(
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const { email, password, forceLogin = false } = loginDto;

   
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: email.toLowerCase() })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

   
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    
    const existingSession = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.user_id = :userId', { userId: user.id })
      .andWhere('session.is_revoked = :isRevoked', { isRevoked: false })
      .andWhere('session.expires_at > :now', { now: new Date() })
      .getOne();

   
    if (existingSession && !forceLogin) {
      return {
        requireForceLogin: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }

   
    if (existingSession && forceLogin) {
      await this.sessionRepository
        .createQueryBuilder()
        .update(Session)
        .set({ is_revoked: true })
        .where('id = :id', { id: existingSession.id })
        .execute();
    }

    
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ lastLoginAt: new Date() })
      .where('id = :id', { id: user.id })
      .execute();

   
    const tokens = await this.generateTokens(user);

   
    const hashedRefreshToken = await this.hashRefreshToken(tokens.refresh_token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    
    const sessionId = uuidv4();
    await this.sessionRepository
      .createQueryBuilder()
      .insert()
      .into(Session)
      .values({
        id: sessionId,
        user_id: user.id,
        refresh_token: hashedRefreshToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
        is_revoked: false,
      })
      .execute();

    
    const freshUser = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id: user.id })
      .getOne();

    if (!freshUser) {
      throw new NotFoundException('User not found');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: freshUser.id,
        email: freshUser.email,
        name: freshUser.name,
        role: freshUser.role,
      },
    };
  }

 
  async refreshTokens(refreshToken: string) {
    const sessions = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .where('session.is_revoked = :isRevoked', { isRevoked: false })
      .andWhere('session.expires_at > :now', { now: new Date() })
      .getMany();

  
    let validSession: Session | null = null;
    for (const session of sessions) {
      const isValid = await this.verifyRefreshToken(refreshToken, session.refresh_token);
      if (isValid) {
        validSession = session;
        break;
      }
    }

    if (!validSession) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

  
    const newTokens = await this.generateTokens(validSession.user);

    const newHashedRefreshToken = await this.hashRefreshToken(newTokens.refresh_token);
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);

    await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({
        refresh_token: newHashedRefreshToken,
        expires_at: newExpiry,
      })
      .where('id = :id', { id: validSession.id })
      .execute();

    return {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
    };
  }

 
  async logout(sessionId: string, userId: string) {
  
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ is_revoked: true })
      .where('id = :sessionId', { sessionId })
      .andWhere('user_id = :userId', { userId })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException('Session not found');
    }

    return { message: 'Logged out successfully' };
  }

 
  async getMe(userId: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'user.lastLoginAt',
        'user.createdAt',
      ])
      .where('user.id = :userId', { userId })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  
  
  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '1h'),
    });

    const refresh_token = uuidv4();

    return { access_token, refresh_token };
  }

  private async hashRefreshToken(refreshToken: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return bcrypt.hash(refreshToken, 10);
  }

  private async verifyRefreshToken(plainToken: string, hashedToken: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(plainToken, hashedToken);
  }
}