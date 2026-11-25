import {
  Body,
  Controller,
  Get,
  Header,
  MessageEvent,
  Post,
  Query,
  Req,
  Res,
  Sse,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { readCookie, ACCESS_TOKEN_COOKIE } from '../auth/auth-cookie.utils';
import { ConfigService } from '../auth/services/config.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateLazygyuEntryDto } from './dto/create-lazygyu-entry.dto';
import { LazygyuRoomService } from './lazygyu-room.service';

@Controller('lazygyu-room')
export class LazygyuRoomController {
  constructor(
    private readonly lazygyuRoomService: LazygyuRoomService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Get('state')
  async getState(
    @Req() request: Request,
    @Query('clientKey') clientKey?: string,
  ) {
    return this.lazygyuRoomService.getPublicState(
      await this.resolveViewer(request, clientKey),
    );
  }

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.lazygyuRoomService.events();
  }

  @Post('entries')
  async addEntry(@Body() body: CreateLazygyuEntryDto, @Req() request: Request) {
    return this.lazygyuRoomService.addEntry(
      body.displayName,
      await this.resolveViewer(request, body.clientKey),
    );
  }

  @Get('frame')
  @Header('Cache-Control', 'no-store')
  async getFrame(@Res() response: Response) {
    const frame = this.lazygyuRoomService.getLatestFrame();

    if (!frame) {
      return response.status(204).send();
    }

    response.setHeader('Content-Type', frame.contentType);
    response.setHeader('X-Lazygyu-Frame-Sequence', String(frame.sequence));
    response.send(frame.buffer);
  }

  private async resolveViewer(request: Request, clientKey?: string) {
    const token = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice(7)
      : readCookie(request.headers.cookie, ACCESS_TOKEN_COOKIE);

    if (!token) {
      return {
        clientKey: clientKey?.trim() || null,
        userEmail: null,
        userId: null,
      };
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(
        token,
        {
          secret: this.configService.accessTokenSecret,
        },
      );

      return {
        clientKey: clientKey?.trim() || null,
        userEmail: payload.email,
        userId: payload.sub,
      };
    } catch {
      return {
        clientKey: clientKey?.trim() || null,
        userEmail: null,
        userId: null,
      };
    }
  }
}
