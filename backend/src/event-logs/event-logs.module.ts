import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/asset.entity';
import { AuthModule } from '../auth/auth.module';
import { Guestbook } from '../guestbook/guestbook.entity';
import { Rsvp } from '../rsvp/rsvp.entity';
import { EventLog } from './event-log.entity';
import { EventLogsController } from './event-logs.controller';
import { EventLogsService } from './event-logs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventLog, Guestbook, Rsvp, Asset]),
    AuthModule,
    JwtModule.register({}),
  ],
  providers: [EventLogsService],
  controllers: [EventLogsController],
  exports: [EventLogsService],
})
export class EventLogsModule {}
