import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user.entity';
import { InvitationMediaService } from './invitation-media.service';
import { InvitationMediaSlot } from './invitation-media.entity';

@Controller('invitation-media')
export class InvitationMediaController {
  constructor(
    private readonly invitationMediaService: InvitationMediaService,
  ) {}

  @Get('public')
  findPublicMedia() {
    return this.invitationMediaService.findPublicMedia();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin')
  findAdminMedia(@Query('slot') slot?: InvitationMediaSlot) {
    return this.invitationMediaService.findAdminMedia(slot);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/assign')
  @UseInterceptors(FileInterceptor('file'))
  createAssignment(
    @Body()
    body: {
      slot?: InvitationMediaSlot;
      targetUrl?: string | null;
      linkUrl?: string | null;
      caption?: string | null;
      title?: string | null;
      displayOrder?: number | string;
      isVisible?: boolean | string;
    },
    @UploadedFile()
    file?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    if (!body.slot) {
      throw new BadRequestException('연결할 영역을 선택해주세요.');
    }

    if (!file) {
      throw new BadRequestException('연결할 이미지 파일을 업로드해주세요.');
    }

    const targetUrl = body.targetUrl ?? body.linkUrl;
    const displayOrder =
      body.displayOrder !== undefined ? Number(body.displayOrder) : undefined;
    const isVisible =
      body.isVisible !== undefined
        ? String(body.isVisible) !== 'false'
        : undefined;

    return this.invitationMediaService.createAssetAndAssignment({
      file,
      slot: body.slot,
      title: body.title,
      targetUrl,
      caption: body.caption,
      displayOrder,
      isVisible,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateItem(
    @Param('id') id: string,
    @Body()
    body: {
      targetUrl?: string | null;
      caption?: string | null;
      displayOrder?: number;
      isVisible?: boolean;
    },
  ) {
    const updatedItem = await this.invitationMediaService.updateItem(+id, body);

    if (!updatedItem) {
      throw new HttpException(
        '청첩장 이미지를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return updatedItem;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/order')
  async updateOrder(
    @Param('id') id: string,
    @Body() body: { displayOrder?: number },
  ) {
    if (typeof body.displayOrder !== 'number') {
      throw new BadRequestException('표시 순서를 입력해주세요.');
    }

    const updatedItem = await this.invitationMediaService.updateOrder(
      +id,
      body.displayOrder,
    );

    if (!updatedItem) {
      throw new HttpException(
        '청첩장 이미지를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return updatedItem;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async removeItem(@Param('id') id: string) {
    const removedItem = await this.invitationMediaService.removeItem(+id);

    if (!removedItem) {
      throw new HttpException(
        '청첩장 이미지를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return removedItem;
  }
}
