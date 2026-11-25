import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { ConfigService } from './services/config.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(credentials: AuthCredentialsDto) {
    const existingUser = await this.usersService.findByEmail(credentials.email);

    if (existingUser) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(credentials.password, 10);
    const user = await this.usersService.create({
      displayName:
        credentials.name?.trim() || credentials.email.trim().split('@')[0],
      email: credentials.email,
      passwordHash,
    });

    return this.buildAuthResponse(user);
  }

  async login(credentials: AuthCredentialsDto) {
    const user = await this.validateUser(
      credentials.email,
      credentials.password,
    );
    return this.buildAuthResponse(user);
  }

  async refresh({ refreshToken }: RefreshTokenDto) {
    let payload: { sub: number };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.refreshTokenSecret,
      });
    } catch {
      throw new UnauthorizedException('리프레시 토큰이 유효하지 않습니다.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('리프레시 토큰을 사용할 수 없습니다.');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException('리프레시 토큰이 유효하지 않습니다.');
    }

    return this.buildAuthResponse(user);
  }

  async logout(refreshToken?: string | null) {
    if (!refreshToken) {
      return { success: true };
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(
        refreshToken,
        {
          secret: this.configService.refreshTokenSecret,
        },
      );
      const user = await this.usersService.findById(payload.sub);

      if (!user?.refreshTokenHash) {
        return { success: true };
      }

      const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (matches) {
        await this.usersService.updateRefreshTokenHash(user.id, null);
      }
    } catch {
      // Cookie clearing on the client should still proceed even if the refresh token is stale.
    }

    return { success: true };
  }

  async me(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    return this.serializeUser(user);
  }

  async bootstrapAdmin() {
    const passwordHash = await bcrypt.hash(
      this.configService.adminPassword,
      10,
    );
    await this.usersService.ensureAdminUser(
      this.configService.adminEmail,
      passwordHash,
    );
  }

  private async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    return user;
  }

  private async buildAuthResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.accessTokenSecret,
      expiresIn: this.configService.accessTokenExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.refreshTokenSecret,
        expiresIn: this.configService.refreshTokenExpiresIn,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshTokenHash(user.id, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
      user: this.serializeUser(user),
    };
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      displayName: user.displayName || user.email.split('@')[0],
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
