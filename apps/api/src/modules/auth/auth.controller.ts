import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { authConfig } from '../../common/config/auth.config';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

/* ─── DTOs (kept co-located for simplicity) ────────────────────────────── */

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

/* ─── Controller ────────────────────────────────────────────────────────── */

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@CurrentUser() user: RequestUser) {
    return this.auth.getProfile(user.userId);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.login(
      dto.email,
      dto.password,
    );

    this.setTokenCookies(res, accessToken, refreshToken);
    return { accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      req.cookies?.[authConfig.refreshCookieName] ??
      req.body?.refreshToken;

    const { accessToken, refreshToken } = await this.auth.refresh(token);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { accessToken };
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.auth.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.email, dto.newPassword);
    return { message: 'Password has been reset successfully' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(authConfig.accessCookieName);
    res.clearCookie(authConfig.refreshCookieName);
    return { message: 'Logged out' };
  }

  /* ─── Helper ──────────────────────────────────────────────────────── */

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(authConfig.accessCookieName, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000, // 1 hour — matches accessTokenExpiry
    });

    res.cookie(authConfig.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — matches refreshTokenExpiry
    });
  }
}
