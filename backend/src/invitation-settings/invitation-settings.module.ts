import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { InvitationSetting } from './invitation-setting.entity';
import { InvitationSettingsController } from './invitation-settings.controller';
import { InvitationSettingsService } from './invitation-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([InvitationSetting]), AuthModule],
  controllers: [InvitationSettingsController],
  providers: [InvitationSettingsService],
  exports: [InvitationSettingsService],
})
export class InvitationSettingsModule {}
