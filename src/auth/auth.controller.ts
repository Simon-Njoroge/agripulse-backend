import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
  @ApiOperation({ 
    summary: 'User Signup',
    description: 'Register a new user account'
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully registered',
    schema: {
      properties: {
        data: { type: 'object' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 409, description: 'Conflict - User already exists' })
  async signup(@Body() signupDto: SignupDto, @Res() res: Response) {
    const result = await this.authService.signup(signupDto);
    
    return res.json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  }

  @Post('login')
  @Public()
  @ApiOperation({ 
    summary: 'User Login',
    description: 'Authenticate user and generate access & refresh tokens'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully logged in',
    schema: {
      properties: {
        data: {
          oneOf: [
            {
              properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
                user: { type: 'object' }
              }
            },
            {
              properties: {
                requireForceLogin: { type: 'boolean' },
                user: { type: 'object' }
              }
            }
          ]
        },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Forbidden - Account locked or inactive' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    const result = await this.authService.login(
      loginDto,
      ipAddress,
      userAgent,
    );

    if (result.requireForceLogin) {
      return res.json({
        data: {
          requireForceLogin: true,
          user: result.user,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!result.access_token || !result.refresh_token) {
      throw new UnauthorizedException('Token pair required');
    }

    this.setAuthCookies(res, result.access_token, result.refresh_token);

    return res.json({
      data: {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        user: result.user,
      },
      timestamp: new Date().toISOString(),
    });
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ 
    summary: 'Refresh Tokens',
    description: 'Get new access and refresh tokens using existing refresh token'
  })
  @ApiBody({ 
    schema: {
      properties: {
        refresh_token: { type: 'string', description: 'Refresh token (can also be sent via cookie)' }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tokens refreshed successfully',
    schema: {
      properties: {
        data: {
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' }
          }
        },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired refresh token' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const result = await this.authService.refreshTokens(refreshToken);

    if (!result.access_token || !result.refresh_token) {
      throw new UnauthorizedException('Token pair required');
    }

    this.setAuthCookies(res, result.access_token, result.refresh_token);

    return res.json({
      data: {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      },
      timestamp: new Date().toISOString(),
    });
  }

  @Post('logout')
  @UseGuards(AtGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ 
    summary: 'User Logout',
    description: 'Logout user and invalidate session'
  })
  @ApiBody({ type: LogoutDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully logged out',
    schema: {
      properties: {
        data: { type: 'object' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async logout(
    @Body() logoutDto: LogoutDto,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const user = req.user;
    
    if (!user || !user.sub) {
      throw new UnauthorizedException('User not authenticated');
    }

    const result = await this.authService.logout(logoutDto.session_id, user.sub);
    
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    
    return res.json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  }

  @Get('me')
  @UseGuards(AtGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ 
    summary: 'Get Current User',
    description: 'Get information of the currently authenticated user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User information retrieved successfully',
    schema: {
      properties: {
        data: { type: 'object' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
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
      const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      return ips.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000, 
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });
  }
}