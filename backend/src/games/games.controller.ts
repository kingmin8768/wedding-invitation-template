import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { concat, from, map } from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { GamesService } from './games.service';

@Controller('games/lazygyu')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('state')
  getState() {
    return this.gamesService.getPublicState();
  }

  @Sse('stream')
  stream() {
    return concat(
      from(this.gamesService.getPublicState()).pipe(
        map(
          (state): MessageEvent => ({
            type: 'state',
            data: {
              gameSlug: 'lazygyu',
              state,
            },
          }),
        ),
      ),
      this.gamesService.stream().pipe(
        map(
          (event): MessageEvent => ({
            type: event.type,
            data: (event.data ?? {}) as object,
          }),
        ),
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyEntry(@CurrentUser() user: AuthenticatedUser) {
    return this.gamesService.getMyEntry(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('entries')
  addEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { displayName?: string },
  ) {
    return this.gamesService.upsertEntry(user, body.displayName || '');
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/entries')
  removeMyEntries(@CurrentUser() user: AuthenticatedUser) {
    return this.gamesService.removeMyEntry(user.sub);
  }
}
