import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Rsvp } from './rsvp.entity';
import { RsvpService } from './rsvp.service';
import { RsvpController } from './rsvp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Rsvp]), AuthModule],
  providers: [RsvpService],
  controllers: [RsvpController],
})
export class RsvpModule {}
