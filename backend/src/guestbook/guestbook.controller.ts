import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { GuestbookService } from './guestbook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

type PublicGuestbookEntry = {
  id: number;
  name: string;
  message: string;
  createdAt: Date;
};

type AdminGuestbookEntry = PublicGuestbookEntry & {
  isHidden: boolean;
  updatedAt: Date;
};

@Controller('guestbook')
export class GuestbookController {
  constructor(private readonly guestbookService: GuestbookService) {}

  @Get()
  async findAll() {
    return (await this.guestbookService.findPublic()).map((entry) =>
      this.toPublicEntry(entry),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin')
  async findAdminAll() {
    return (await this.guestbookService.findAdminAll()).map((entry) =>
      this.toAdminEntry(entry),
    );
  }

  @Post()
  async create(
    @Body() body: { name: string; password: string; message: string },
  ) {
    if (!body.name || !body.message || !body.password) {
      throw new HttpException(
        '이름, 비밀번호, 메시지를 모두 입력해주세요.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const created = await this.guestbookService.create(body);
    return this.toPublicEntry(created);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Body() body: { password: string }) {
    const success = await this.guestbookService.delete(+id, body.password);
    if (!success) {
      throw new HttpException(
        '비밀번호가 일치하지 않거나 게시물을 찾을 수 없습니다.',
        HttpStatus.FORBIDDEN,
      );
    }
    return { message: '삭제되었습니다.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/visibility')
  async updateVisibility(
    @Param('id') id: string,
    @Body() body: { isHidden: boolean },
  ) {
    const updated = await this.guestbookService.updateVisibility(
      +id,
      body.isHidden,
    );

    if (!updated) {
      throw new HttpException(
        '방명록 항목을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toAdminEntry(updated);
  }

  private toPublicEntry(entry: {
    id: number;
    name: string;
    message: string;
    createdAt: Date;
  }): PublicGuestbookEntry {
    return {
      id: entry.id,
      name: entry.name,
      message: entry.message,
      createdAt: entry.createdAt,
    };
  }

  private toAdminEntry(entry: {
    id: number;
    name: string;
    message: string;
    isHidden: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): AdminGuestbookEntry {
    return {
      ...this.toPublicEntry(entry),
      isHidden: entry.isHidden,
      updatedAt: entry.updatedAt,
    };
  }
}
