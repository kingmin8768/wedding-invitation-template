import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  get corsAllowedOrigins() {
    const configuredOrigins = [
      ...this.readCsvEnv('CORS_ALLOWED_ORIGINS'),
      process.env.APP_ORIGIN?.trim(),
      process.env.FRONTEND_ORIGIN?.trim(),
    ].filter((origin): origin is string => Boolean(origin));

    if (configuredOrigins.length > 0) {
      return [...new Set(configuredOrigins)];
    }

    if (!this.isProduction) {
      return [
        'http://localhost:3000',
        'http://localhost:4173',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:4173',
        'http://127.0.0.1:5173',
      ];
    }

    throw new Error(
      'CORS_ALLOWED_ORIGINS or APP_ORIGIN environment variable is required in production.',
    );
  }

  get accessTokenSecret() {
    return this.readRequiredEnv('JWT_ACCESS_SECRET', 'wedding-access-secret');
  }

  get refreshTokenSecret() {
    return this.readRequiredEnv('JWT_REFRESH_SECRET', 'wedding-refresh-secret');
  }

  get accessTokenExpiresIn() {
    return process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  }

  get refreshTokenExpiresIn() {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  get adminEmail() {
    return this.readRequiredEnv('ADMIN_EMAIL', 'admin@wedding.local');
  }

  get adminPassword() {
    return this.readRequiredEnv('ADMIN_PASSWORD', 'admin1234');
  }

  get accessTokenCookieMaxAge() {
    return this.durationToMs(this.accessTokenExpiresIn);
  }

  get refreshTokenCookieMaxAge() {
    return this.durationToMs(this.refreshTokenExpiresIn);
  }

  validateRequiredConfiguration() {
    void this.accessTokenSecret;
    void this.refreshTokenSecret;
    void this.adminEmail;
    void this.adminPassword;
    void this.corsAllowedOrigins;
  }

  isCorsOriginAllowed(origin: string) {
    return this.corsAllowedOrigins.includes(origin);
  }

  private readRequiredEnv(name: string, fallback: string) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }

    if (!this.isProduction) {
      return fallback;
    }

    throw new Error(`${name} environment variable is required in production.`);
  }

  private readCsvEnv(name: string) {
    return (process.env[name] || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private durationToMs(duration: string) {
    const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration.trim());
    if (!match) {
      return undefined;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}
