import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UserRole } from '../users/user.entity';
import { GameSubmissionStatus } from './game-event-state.entity';
import { GamesService } from './games.service';

@Controller('admin/games/lazygyu')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class GamesAdminController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  getState() {
    return this.gamesService.getAdminState();
  }

  @Get('host-ticket')
  issueHostTicket(@CurrentUser() user: AuthenticatedUser) {
    return this.gamesService.issueHostTicket(user);
  }

  @Get('entries')
  listEntries() {
    return this.gamesService.getAdminEntries();
  }

  @Patch('submission')
  updateSubmission(@Body() body: { status?: string }) {
    if (body.status !== GameSubmissionStatus.OPEN) {
      return this.gamesService.updateSubmissionStatus(
        GameSubmissionStatus.CLOSED,
      );
    }

    return this.gamesService.updateSubmissionStatus(GameSubmissionStatus.OPEN);
  }

  @Patch('winner-mode')
  updateWinnerMode(
    @Body() body: { winnerMode?: string; customWinnerRank?: number },
  ) {
    return this.gamesService.updateWinnerMode(body);
  }

  @Post('start')
  start() {
    return this.gamesService.startRound();
  }

  @Post('reset')
  reset(@Body() body?: { clearEntries?: boolean }) {
    return this.gamesService.resetEvent('lazygyu', {
      clearEntries: Boolean(body?.clearEntries),
    });
  }

  @Delete('entries/:id')
  removeEntry(@Param('id') id: string) {
    return this.gamesService.removeAdminEntry(Number(id));
  }
}
