import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsBoolean()
  forceLogin?: boolean;
}

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class RefreshTokenDto {
  @IsString()
  refresh_token!: string;
}

export class LogoutDto {
  @IsString()
  session_id!: string;
}
