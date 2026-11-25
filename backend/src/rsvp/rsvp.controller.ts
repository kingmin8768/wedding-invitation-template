import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { RsvpService } from './rsvp.service';

@Controller('rsvp')
export class RsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll() {
    return this.rsvpService.findAll();
  }

  @Post()
  async create(
    @Body()
    body: {
      side: string;
      name: string;
      attendance: string;
      afterPartyAttendance?: string;
      guests: number;
      meal: string;
    },
  ) {
    if (!body.name) {
      throw new HttpException('이름을 입력해주세요.', HttpStatus.BAD_REQUEST);
    }
    return this.rsvpService.create(body);
  }
}
