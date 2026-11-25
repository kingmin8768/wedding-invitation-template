import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  readCookie,
} from './auth-cookie.utils';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from './services/config.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './types/authenticated-user.type';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  async signup(
    @Body() credentials: AuthCredentialsDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.signup(credentials);
    this.setSessionCookies(request, response, session);
    return this.serializeSession(session);
  }

  @Post('login')
  async login(
    @Body() credentials: AuthCredentialsDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(credentials);
    this.setSessionCookies(request, response, session);
    return this.serializeSession(session);
  }

  @Post('refresh')
  async refresh(
    @Body() body: Partial<RefreshTokenDto>,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      body.refreshToken ||
      readCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE);
    const session = await this.authService.refresh({
      refreshToken: refreshToken || '',
    });
    this.setSessionCookies(request, response, session);
    return this.serializeSession(session);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.sub);
  }

  @Post('logout')
  async logout(
    @Body() body: Partial<RefreshTokenDto>,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      body.refreshToken ||
      readCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE);
    this.clearSessionCookies(request, response);
    return this.authService.logout(refreshToken || null);
  }

  private setSessionCookies(
    request: Request,
    response: Response,
    session: { accessToken: string; refreshToken: string },
  ) {
    const baseCookieOptions = this.buildCookieOptions(request);

    response.cookie(ACCESS_TOKEN_COOKIE, session.accessToken, {
      ...baseCookieOptions,
      maxAge: this.configService.accessTokenCookieMaxAge,
    });
    response.cookie(REFRESH_TOKEN_COOKIE, session.refreshToken, {
      ...baseCookieOptions,
      maxAge: this.configService.refreshTokenCookieMaxAge,
    });
  }

  private clearSessionCookies(request: Request, response: Response) {
    const baseCookieOptions = this.buildCookieOptions(request);

    response.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions);
    response.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions);
  }

  private buildCookieOptions(request: Request) {
    const requestOrigin = request.headers.origin?.trim();
    const forwardedProto = String(request.headers['x-forwarded-proto'] || '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const isHttps = Boolean(
      request.secure ||
      forwardedProto === 'https' ||
      process.env.COOKIE_SECURE === 'true' ||
      requestOrigin?.startsWith('https://'),
    );
    const apiOrigin = `${isHttps ? 'https' : request.protocol}://${request.get('host')}`;
    const isCrossOriginRequest =
      this.configService.isProduction &&
      Boolean(requestOrigin) &&
      requestOrigin !== apiOrigin;
    const useSameSiteNone =
      isHttps && (isCrossOriginRequest || this.configService.allowIframeEmbed);

    return {
      httpOnly: true,
      sameSite: (useSameSiteNone ? 'none' : 'lax') as 'none' | 'lax',
      secure: isHttps,
      path: '/',
    };
  }

  private serializeSession(session: {
    user: {
      id: number;
      displayName: string;
      email: string;
      role: string;
      createdAt?: Date | null;
    };
  }) {
    return {
      user: session.user,
    };
  }
}
