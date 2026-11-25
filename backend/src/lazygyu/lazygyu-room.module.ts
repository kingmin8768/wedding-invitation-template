import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LazygyuEntry } from './lazygyu-entry.entity';
import { LazygyuRoomAdminController } from './lazygyu-room-admin.controller';
import { LazygyuRoomController } from './lazygyu-room.controller';
import { LazygyuRoom } from './lazygyu-room.entity';
import { LazygyuRoomService } from './lazygyu-room.service';

@Module({
  imports: [TypeOrmModule.forFeature([LazygyuRoom, LazygyuEntry]), AuthModule],
  providers: [LazygyuRoomService],
  controllers: [LazygyuRoomController, LazygyuRoomAdminController],
  exports: [LazygyuRoomService],
})
export class LazygyuRoomModule {}
