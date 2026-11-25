import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Guestbook } from './guestbook.entity';
import { GuestbookService } from './guestbook.service';
import { GuestbookController } from './guestbook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Guestbook]), AuthModule],
  providers: [GuestbookService],
  controllers: [GuestbookController],
})
export class GuestbookModule {}
