import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user.entity';
import { FinishLazygyuRoundDto } from './dto/finish-lazygyu-round.dto';
import { UpdateLazygyuControlDto } from './dto/update-lazygyu-control.dto';
import { LazygyuRoomService } from './lazygyu-room.service';

@Controller('lazygyu-room/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class LazygyuRoomAdminController {
  constructor(private readonly lazygyuRoomService: LazygyuRoomService) {}

  @Get('state')
  getState() {
    return this.lazygyuRoomService.getAdminState();
  }

  @Patch('control')
  updateControls(@Body() body: UpdateLazygyuControlDto) {
    return this.lazygyuRoomService.updateControls(body);
  }

  @Post('start')
  startRound() {
    return this.lazygyuRoomService.startRound();
  }

  @Post('finish')
  finishRound(@Body() body: FinishLazygyuRoundDto) {
    return this.lazygyuRoomService.finishRound(body);
  }

  @Post('reset')
  resetRoom() {
    return this.lazygyuRoomService.resetRoom();
  }

  @Delete('entries/:id')
  removeEntry(@Param('id', ParseIntPipe) id: number) {
    return this.lazygyuRoomService.removeEntry(id);
  }

  @Post('frame')
  @UseInterceptors(
    FileInterceptor('frame', {
      storage: memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 },
    }),
  )
  async uploadFrame(
    @UploadedFile() file?: { buffer?: Buffer; mimetype?: string },
  ) {
    if (file?.buffer?.length) {
      await this.lazygyuRoomService.storeFrame(
        file.buffer,
        file.mimetype || 'image/jpeg',
      );
    }

    return this.lazygyuRoomService.getAdminState();
  }

  @Post('stream/stop')
  stopStream() {
    return this.lazygyuRoomService.stopStream();
  }
}
