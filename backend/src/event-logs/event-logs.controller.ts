import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_TOKEN_COOKIE, readCookie } from '../auth/auth-cookie.utils';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConfigService } from '../auth/services/config.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UserRole } from '../users/user.entity';
import { EventLogsService } from './event-logs.service';

@Controller()
export class EventLogsController {
  constructor(
    private readonly eventLogsService: EventLogsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Post('event-logs')
  async recordEvent(
    @Body()
    body: {
      eventType?: string;
      section?: string | null;
      action?: string | null;
      label?: string | null;
      path?: string | null;
      url?: string | null;
      referrer?: string | null;
      sessionId?: string | null;
      userName?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    @Req() request: Request,
  ) {
    if (!body.eventType) {
      throw new HttpException(
        'eventType을 입력해주세요.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const optionalUser = await this.resolveOptionalUser(request);

    return this.eventLogsService.recordEvent(
      {
        ...body,
        eventType: body.eventType,
        userId: optionalUser?.sub ?? null,
        userName: body.userName ?? null,
        userEmail: optionalUser?.email ?? null,
        userRole: optionalUser?.role ?? null,
      },
      {
        ip: request.ip,
        headers: request.headers as Record<
          string,
          string | string[] | undefined
        >,
      },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/event-logs')
  async findAdminEventLogs(
    @Query('eventType') eventType?: string,
    @Query('section') section?: string,
    @Query('action') action?: string,
    @Query('sessionId') sessionId?: string,
    @Query('userName') userName?: string,
    @Query('userEmail') userEmail?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.eventLogsService.queryAdminEventLogs({
      eventType,
      section,
      action,
      sessionId,
      userName,
      userEmail,
      search,
      from,
      to,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/event-logs/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportAdminEventLogs(
    @Res({ passthrough: true }) response: Response,
    @Query('eventType') eventType?: string,
    @Query('section') section?: string,
    @Query('action') action?: string,
    @Query('sessionId') sessionId?: string,
    @Query('userName') userName?: string,
    @Query('userEmail') userEmail?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="event-logs.csv"',
    );

    return this.eventLogsService.exportAdminEventLogs({
      eventType,
      section,
      action,
      sessionId,
      userName,
      userEmail,
      search,
      from,
      to,
    });
  }

  private async resolveOptionalUser(request: Request) {
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : readCookie(request.headers.cookie, ACCESS_TOKEN_COOKIE);

    if (!token) {
      return null;
    }

    try {
      return await this.jwtService.verifyAsync<AuthenticatedUser>(token, {
        secret: this.configService.accessTokenSecret,
      });
    } catch {
      return null;
    }
  }
}
