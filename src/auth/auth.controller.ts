import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto, LogoutDto } from './dto/login.dto';
import { AtGuard } from '../common/guards/at.guard';
import { Public } from '../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';

interface RequestWithUser extends Request {
  user?: {
    sub: string;
    email: string;
    role: string;
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User Signup',
    description: 'Register a new user account',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully registered',
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 409, description: 'Conflict - User already exists' })
  async signup(@Body() signupDto: SignupDto) {
    const result = await this.authService.signup(signupDto);

    return {
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User Login',
    description: 'Authenticate user and generate access & refresh tokens',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Account locked or inactive',
  })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    if (result.requireForceLogin) {
      return {
        data: {
          requireForceLogin: true,
          user: result.user,
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (!result.access_token || !result.refresh_token) {
      throw new UnauthorizedException('Token pair required');
    }

    const response = req.res as any;
    if (response) {
      this.setAuthCookies(response, result.access_token, result.refresh_token);
    }

    return {
      data: {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        user: result.user,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh Tokens',
    description:
      'Get new access and refresh tokens using existing refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired refresh token',
  })
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const result = await this.authService.refreshTokens(refreshToken);

    if (!result.access_token || !result.refresh_token) {
      throw new UnauthorizedException('Token pair required');
    }

    const response = req.res as any;
    if (response) {
      this.setAuthCookies(response, result.access_token, result.refresh_token);
    }

    return {
      data: {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('logout')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'User Logout',
    description: 'Logout user and invalidate all their sessions',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async logout(@Req() req: RequestWithUser) {
    const user = req.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException('User not authenticated');
    }

    const result = await this.authService.logout(user.sub);

    const response = req.res as any;
    if (response) {
      response.clearCookie('access_token');
      response.clearCookie('refresh_token');
    }

    return {
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
  @Get('me')
  @UseGuards(AtGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Get Current User',
    description: 'Get information of the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getMe(@Req() req: RequestWithUser) {
    const user = req.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException('User not authenticated');
    }

    const result = await this.authService.getMe(user.sub);

    return {
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  private getClientIp(req: Request): string {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const ips = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor;
      return ips.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private setAuthCookies(
    response: any,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = process.env.NODE_ENV === 'production';

    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000,
    });

    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
