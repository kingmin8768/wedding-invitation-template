import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { webcrypto } from 'node:crypto';
import { resolve } from 'node:path';
import { GuestbookModule } from './guestbook/guestbook.module';
import { RsvpModule } from './rsvp/rsvp.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AssetsModule } from './assets/assets.module';
import { EventLogsModule } from './event-logs/event-logs.module';
import { InvitationMediaModule } from './invitation-media/invitation-media.module';
import { LazygyuRoomModule } from './lazygyu/lazygyu-room.module';
import { GamesModule } from './games/games.module';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: resolve(process.env.UPLOAD_ROOT || 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (response) => {
          response.setHeader('X-Content-Type-Options', 'nosniff');
        },
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type:
          process.env.DB_DRIVER === 'better-sqlite3'
            ? 'better-sqlite3'
            : 'sqlite',
        database: process.env.DB_PATH || 'wedding.db',
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    GuestbookModule,
    RsvpModule,
    UsersModule,
    AuthModule,
    AdminModule,
    AssetsModule,
    EventLogsModule,
    InvitationMediaModule,
    LazygyuRoomModule,
    GamesModule,
  ],
})
export class AppModule {}
