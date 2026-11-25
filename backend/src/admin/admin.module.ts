import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventLogsModule } from '../event-logs/event-logs.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, EventLogsModule],
  controllers: [AdminController],
})
export class AdminModule {}
