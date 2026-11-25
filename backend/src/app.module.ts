import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { webcrypto } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { GuestbookModule } from './guestbook/guestbook.module';
import { RsvpModule } from './rsvp/rsvp.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AssetsModule } from './assets/assets.module';
import { EventLogsModule } from './event-logs/event-logs.module';
import { InvitationMediaModule } from './invitation-media/invitation-media.module';
import { InvitationSettingsModule } from './invitation-settings/invitation-settings.module';
import { LazygyuRoomModule } from './lazygyu/lazygyu-room.module';
import { GamesModule } from './games/games.module';
import { HealthController } from './health.controller';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

const resolveUploadRoot = () => {
  const uploadRoot = resolve(process.env.UPLOAD_ROOT || 'uploads');
  mkdirSync(uploadRoot, { recursive: true });
  return uploadRoot;
};

@Module({
  imports: [
    ServeStaticModule.forRootAsync({
      useFactory: () => [
        {
          rootPath: resolveUploadRoot(),
          serveRoot: '/uploads',
          serveStaticOptions: {
            setHeaders: (response) => {
              response.setHeader('X-Content-Type-Options', 'nosniff');
            },
          },
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databasePath = process.env.DB_PATH || 'wedding.db';
        if (databasePath !== ':memory:') {
          mkdirSync(dirname(resolve(databasePath)), { recursive: true });
        }

        return {
          type:
            process.env.DB_DRIVER === 'better-sqlite3'
              ? 'better-sqlite3'
              : 'sqlite',
          database: databasePath,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    GuestbookModule,
    RsvpModule,
    UsersModule,
    AuthModule,
    AdminModule,
    AssetsModule,
    EventLogsModule,
    InvitationMediaModule,
    InvitationSettingsModule,
    LazygyuRoomModule,
    GamesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
