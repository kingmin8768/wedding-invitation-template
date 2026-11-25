import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user.entity';
import { InvitationSettingsPayload } from './default-invitation-settings';
import { InvitationSettingsService } from './invitation-settings.service';

@Controller('invitation-settings')
export class InvitationSettingsController {
  constructor(
    private readonly invitationSettingsService: InvitationSettingsService,
  ) {}

  @Get('public')
  getPublicSettings() {
    return this.invitationSettingsService.getPublicSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin')
  getAdminSettings() {
    return this.invitationSettingsService.getPublicSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin')
  updateAdminSettings(@Body() body: Partial<InvitationSettingsPayload>) {
    return this.invitationSettingsService.updateSettings(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/reset')
  resetAdminSettings() {
    return this.invitationSettingsService.resetSettings();
  }
}
