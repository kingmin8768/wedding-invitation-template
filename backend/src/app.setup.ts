import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ConfigService } from './auth/services/config.service';

type RateLimitRule = {
  id: string;
  methods: string[];
  path: RegExp;
  windowMs: number;
  max: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    id: 'auth-signup',
    methods: ['POST'],
    path: /^\/api\/auth\/signup$/,
    windowMs: 15 * 60 * 1000,
    max: 5,
  },
  {
    id: 'auth-login',
    methods: ['POST'],
    path: /^\/api\/auth\/login$/,
    windowMs: 15 * 60 * 1000,
    max: 10,
  },
  {
    id: 'auth-refresh',
    methods: ['POST'],
    path: /^\/api\/auth\/refresh$/,
    windowMs: 15 * 60 * 1000,
    max: 30,
  },
  {
    id: 'guestbook-create',
    methods: ['POST'],
    path: /^\/api\/guestbook$/,
    windowMs: 15 * 60 * 1000,
    max: 5,
  },
  {
    id: 'guestbook-delete',
    methods: ['DELETE'],
    path: /^\/api\/guestbook\/\d+$/,
    windowMs: 15 * 60 * 1000,
    max: 10,
  },
  {
    id: 'rsvp-create',
    methods: ['POST'],
    path: /^\/api\/rsvp$/,
    windowMs: 15 * 60 * 1000,
    max: 5,
  },
  {
    id: 'event-log-create',
    methods: ['POST'],
    path: /^\/api\/event-logs$/,
    windowMs: 60 * 1000,
    max: 120,
  },
  {
    id: 'lazygyu-entry-create',
    methods: ['POST'],
    path: /^\/api\/lazygyu-room\/entries$/,
    windowMs: 10 * 1000,
    max: 40,
  },
  {
    id: 'shared-photo-upload',
    methods: ['POST'],
    path: /^\/api\/assets\/shared-photos\/upload$/,
    windowMs: 15 * 60 * 1000,
    max: 10,
  },
  {
    id: 'games-entry-upsert',
    methods: ['POST'],
    path: /^\/api\/games\/lazygyu\/entries$/,
    windowMs: 60 * 1000,
    max: 20,
  },
  {
    id: 'games-entry-delete',
    methods: ['DELETE'],
    path: /^\/api\/games\/lazygyu\/me\/entries$/,
    windowMs: 60 * 1000,
    max: 20,
  },
];

const isAdminRateLimitExemptPath = (path: string) =>
  /^\/api\/(?:.+\/)?admin(?:\/|$)/.test(path);

const buildContentSecurityPolicy = () =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self' https://www.openstreetmap.org",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'wasm-unsafe-eval' https://oapi.map.naver.com https://*.pstatic.net",
    "connect-src 'self' https: ws: wss:",
  ].join('; ');

const applySecurityHeaders = (response: Response, isProduction: boolean) => {
  response.setHeader('Content-Security-Policy', buildContentSecurityPolicy());
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (isProduction) {
    response.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
};

const createRateLimitMiddleware = () => {
  const store = new Map<string, RateLimitEntry>();

  return (request: Request, response: Response, next: NextFunction) => {
    if (isAdminRateLimitExemptPath(request.path)) {
      next();
      return;
    }

    const rule = RATE_LIMIT_RULES.find(
      (candidate) =>
        candidate.methods.includes(request.method.toUpperCase()) &&
        candidate.path.test(request.path),
    );

    if (!rule) {
      next();
      return;
    }

    const now = Date.now();
    const key = `${rule.id}:${request.ip || 'unknown'}`;
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + rule.windowMs });
      next();
      return;
    }

    if (current.count >= rule.max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      );
      response.setHeader('Retry-After', String(retryAfterSeconds));
      response.status(429).json({
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      });
      return;
    }

    current.count += 1;
    store.set(key, current);
    next();
  };
};

export const configureApp = async (app: INestApplication) => {
  const configService = app.get(ConfigService);
  configService.validateRequiredConfiguration();

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, configService.isCorsOriginAllowed(origin));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set?.('trust proxy', 1);
  expressApp.disable?.('x-powered-by');

  app.use((request: Request, response: Response, next: NextFunction) => {
    applySecurityHeaders(response, configService.isProduction);
    next();
  });
  app.use(createRateLimitMiddleware());
};
