import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { readCookie } from '../auth-cookie.utils';
import { ConfigService } from '../services/config.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractAccessToken(request.headers);

    if (!token) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(
        token,
        {
          secret: this.configService.accessTokenSecret,
        },
      );
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  private extractAccessToken(headers: {
    authorization?: string;
    cookie?: string | string[];
  }) {
    const header = headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return readCookie(headers.cookie, 'weddingInvitationAccessToken');
  }
}
