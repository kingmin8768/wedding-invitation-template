import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

type RuntimeSecrets = {
  accessTokenSecret: string;
  refreshTokenSecret: string;
};

@Injectable()
export class ConfigService {
  private cachedRuntimeSecrets: RuntimeSecrets | null = null;

  get isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  get hasExplicitCorsOrigins() {
    return this.getConfiguredCorsOrigins().length > 0;
  }

  get corsAllowedOrigins() {
    const configuredOrigins = this.getConfiguredCorsOrigins();

    if (configuredOrigins.length > 0) {
      return configuredOrigins;
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

    return [];
  }

  get accessTokenSecret() {
    const configured = process.env.JWT_ACCESS_SECRET?.trim();
    if (configured) {
      return configured;
    }

    if (!this.isProduction) {
      return 'wedding-access-secret';
    }

    return this.loadOrCreateRuntimeSecrets().accessTokenSecret;
  }

  get refreshTokenSecret() {
    const configured = process.env.JWT_REFRESH_SECRET?.trim();
    if (configured) {
      return configured;
    }

    if (!this.isProduction) {
      return 'wedding-refresh-secret';
    }

    return this.loadOrCreateRuntimeSecrets().refreshTokenSecret;
  }

  get accessTokenExpiresIn() {
    return process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  }

  get refreshTokenExpiresIn() {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  get adminEmail() {
    return (
      process.env.ADMIN_EMAIL?.trim() ||
      (this.isProduction ? 'admin@example.com' : 'admin@wedding.local')
    );
  }

  get adminPassword() {
    return process.env.ADMIN_PASSWORD?.trim() || 'admin1234';
  }

  get isUsingDefaultAdminPassword() {
    return !process.env.ADMIN_PASSWORD?.trim();
  }

  get allowIframeEmbed() {
    return (
      process.env.ALLOW_IFRAME_EMBED === 'true' ||
      Boolean(process.env.SPACE_ID?.trim())
    );
  }

  get frontendDistDir(): string | null {
    const configured = process.env.FRONTEND_DIST_DIR?.trim();
    if (!configured) {
      return null;
    }

    const resolved = resolve(configured);
    return existsSync(join(resolved, 'index.html')) ? resolved : null;
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

  private getConfiguredCorsOrigins() {
    const configuredOrigins = [
      ...this.readCsvEnv('CORS_ALLOWED_ORIGINS'),
      process.env.APP_ORIGIN?.trim(),
      process.env.FRONTEND_ORIGIN?.trim(),
    ].filter((origin): origin is string => Boolean(origin));

    return [...new Set(configuredOrigins)];
  }

  private loadOrCreateRuntimeSecrets(): RuntimeSecrets {
    if (this.cachedRuntimeSecrets) {
      return this.cachedRuntimeSecrets;
    }

    const dbPath = process.env.DB_PATH?.trim() || 'wedding.db';
    const secretsDir =
      dbPath === ':memory:' ? process.cwd() : dirname(resolve(dbPath));
    const secretsFile = join(secretsDir, '.runtime-secrets.json');

    try {
      if (existsSync(secretsFile)) {
        const parsed = JSON.parse(
          readFileSync(secretsFile, 'utf-8'),
        ) as Partial<RuntimeSecrets>;
        if (parsed.accessTokenSecret && parsed.refreshTokenSecret) {
          this.cachedRuntimeSecrets = {
            accessTokenSecret: parsed.accessTokenSecret,
            refreshTokenSecret: parsed.refreshTokenSecret,
          };
          return this.cachedRuntimeSecrets;
        }
      }
    } catch {
      // Regenerate below if the persisted runtime secrets file is unreadable.
    }

    const generated: RuntimeSecrets = {
      accessTokenSecret: randomBytes(32).toString('hex'),
      refreshTokenSecret: randomBytes(32).toString('hex'),
    };

    try {
      mkdirSync(secretsDir, { recursive: true });
      writeFileSync(secretsFile, JSON.stringify(generated), {
        encoding: 'utf-8',
        mode: 0o600,
      });
    } catch {
      // Keep secrets in memory if the filesystem is read-only.
    }

    this.cachedRuntimeSecrets = generated;
    return generated;
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
