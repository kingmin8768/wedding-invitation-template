import {
  BadRequestException,
  Body,
  Controller,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UserRole } from '../users/user.entity';
import { AssetCategory, AssetModerationStatus } from './asset.entity';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('invitation')
  findPublicInvitationAssets() {
    return this.assetsService.findPublicInvitationAssets();
  }

  @Get('shared-photos')
  findPublicSharedPhotos() {
    return this.assetsService.findPublicSharedPhotos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin')
  findAdminAssets(@Query('category') category?: AssetCategory) {
    return this.assetsService.findAdminAssets(category);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/shared-photos')
  findMySharedPhotos(@CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.findMemberAssets(
      user.sub,
      AssetCategory.SHARED_PHOTO,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadAdminAsset(
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
    @Body() body: { title?: string; category?: AssetCategory },
  ) {
    if (!file) {
      throw new BadRequestException('업로드할 파일을 선택해주세요.');
    }

    const category = body.category || AssetCategory.INVITATION;

    return this.assetsService.createUploadedAsset({
      category,
      file,
      title: body.title,
      moderationStatus: AssetModerationStatus.APPROVED,
      isVisible: true,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('shared-photos/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadSharedPhoto(
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
    @Body() body: { title?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('업로드할 사진을 선택해주세요.');
    }

    return this.assetsService.createUploadedAsset({
      category: AssetCategory.SHARED_PHOTO,
      file,
      title: body.title,
      moderationStatus: AssetModerationStatus.PENDING,
      isVisible: false,
      uploadedByUserId: user.sub,
      uploaderEmail: user.email,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/visibility')
  async updateVisibility(
    @Param('id') id: string,
    @Body() body: { isVisible: boolean },
  ) {
    const updated = await this.assetsService.updateVisibility(
      +id,
      body.isVisible,
    );

    if (!updated) {
      throw new HttpException('자료를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    return updated;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/approve')
  async approvePending(@Param('id') id: string) {
    const updated = await this.assetsService.approve(+id);

    if (!updated) {
      throw new HttpException('자료를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    return updated;
  }
}
