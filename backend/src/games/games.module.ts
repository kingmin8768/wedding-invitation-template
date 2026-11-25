import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GameEntry } from './game-entry.entity';
import { GameEventState } from './game-event-state.entity';
import { GameRound } from './game-round.entity';
import { GamesAdminController } from './games-admin.controller';
import { GamesController } from './games.controller';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameEntry, GameEventState, GameRound]),
    AuthModule,
  ],
  controllers: [GamesController, GamesAdminController],
  providers: [GamesService, GamesGateway],
  exports: [GamesService],
})
export class GamesModule {}
