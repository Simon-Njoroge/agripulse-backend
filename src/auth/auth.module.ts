import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Session } from 'src/sessions/entities/session.entity';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { PassportModule } from '@nestjs/passport/dist/passport.module';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { ConfigModule } from '@nestjs/config/dist/config.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt-at' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const raw = config.get<string | number | undefined>(
          'ACCESS_EXPIRES_IN',
        );
        const expiresIn =
          typeof raw === 'string' && /^\d+$/.test(raw)
            ? Number(raw)
            : (raw ?? '15m');
        return {
          secret: config.get<string>('ACCESS_TOKEN_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([User, Session])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule { }
