import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { Observable, Subject, filter, interval, map, merge } from 'rxjs';
import { Repository } from 'typeorm';
import { ConfigService } from '../auth/services/config.service';
import { GameEntry } from './game-entry.entity';
import {
  GameEventState,
  GameSubmissionStatus,
  GameWinnerMode,
} from './game-event-state.entity';
import { GameRound, GameRoundStatus } from './game-round.entity';

const DEFAULT_GAME_SLUG = 'lazygyu';
type BroadcastEvent = {
  type: string;
  data: unknown;
};

@Injectable()
export class GamesService {
  private readonly events$ = new Subject<BroadcastEvent>();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(GameEntry)
    private readonly gameEntryRepository: Repository<GameEntry>,
    @InjectRepository(GameEventState)
    private readonly gameEventStateRepository: Repository<GameEventState>,
    @InjectRepository(GameRound)
    private readonly gameRoundRepository: Repository<GameRound>,
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  observeEvents(): Observable<BroadcastEvent> {
    return this.events$.asObservable();
  }

  async issueHostTicket(user: { sub: number; email: string; role: string }) {
    return {
      token: await this.jwtService.signAsync(
        {
          sub: user.sub,
          email: user.email,
          role: user.role,
          scope: 'lazygyu-host',
        },
        {
          secret:
            this.configService?.accessTokenSecret ||
            process.env.JWT_ACCESS_SECRET,
          expiresIn: '5m',
        },
      ),
    };
  }

  async getPublicState(gameSlug = DEFAULT_GAME_SLUG) {
    const [eventState, entries, currentRound] = await Promise.all([
      this.ensureState(gameSlug),
      this.findActiveEntries(gameSlug),
      this.findCurrentRound(gameSlug),
    ]);

    return {
      gameSlug,
      submissionStatus: eventState.submissionStatus,
      winnerMode: eventState.winnerMode || GameWinnerMode.FIRST,
      customWinnerRank: eventState.customWinnerRank || 1,
      entryCount: entries.length,
      entries: entries.map((entry) => ({
        id: entry.id,
        displayName: entry.displayName,
        submittedAt: entry.createdAt,
      })),
      round: this.serializeRound(currentRound),
      updatedAt: eventState.updatedAt,
    };
  }

  async getMyEntry(userId: number, gameSlug = DEFAULT_GAME_SLUG) {
    const entries = await this.gameEntryRepository.find({
      where: {
        gameSlug,
        submittedByUserId: userId,
        isActive: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
    });

    return {
      entryCount: entries.length,
      latestEntry: entries[0]
        ? {
            id: entries[0].id,
            displayName: entries[0].displayName,
            updatedAt: entries[0].updatedAt,
          }
        : null,
    };
  }

  async getAdminState(gameSlug = DEFAULT_GAME_SLUG) {
    const [state, entries] = await Promise.all([
      this.getPublicState(gameSlug),
      this.gameEntryRepository.find({
        where: {
          gameSlug,
          isActive: true,
        },
        order: { createdAt: 'ASC', id: 'ASC' },
      }),
    ]);

    return {
      ...state,
      entries: entries.map((entry) => ({
        id: entry.id,
        displayName: entry.displayName,
        submittedByUserId: entry.submittedByUserId,
        submittedByEmail: entry.submittedByEmail,
        submittedAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    };
  }

  async updateWinnerMode(
    payload: { winnerMode?: string; customWinnerRank?: number },
    gameSlug = DEFAULT_GAME_SLUG,
  ) {
    const state = await this.ensureState(gameSlug);

    if (state.submissionStatus === GameSubmissionStatus.RUNNING) {
      throw new BadRequestException(
        '추첨이 진행 중일 때는 당첨 기준을 바꿀 수 없습니다.',
      );
    }

    const nextMode =
      payload.winnerMode === GameWinnerMode.LAST
        ? GameWinnerMode.LAST
        : payload.winnerMode === GameWinnerMode.CUSTOM
          ? GameWinnerMode.CUSTOM
          : GameWinnerMode.FIRST;

    state.winnerMode = nextMode;
    state.customWinnerRank = Math.max(1, Number(payload.customWinnerRank) || 1);

    await this.gameEventStateRepository.save(state);
    await this.broadcastState(gameSlug, 'room_state_changed');
    return this.getPublicState(gameSlug);
  }

  async upsertEntry(
    user: { sub: number; email: string },
    displayName: string,
    gameSlug = DEFAULT_GAME_SLUG,
  ) {
    const normalizedName = displayName.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      throw new BadRequestException('핀볼 이름을 입력해주세요.');
    }

    if (normalizedName.length > 24) {
      throw new BadRequestException('핀볼 이름은 24자 이하로 입력해주세요.');
    }

    const state = await this.ensureState(gameSlug);
    if (state.submissionStatus !== GameSubmissionStatus.OPEN) {
      throw new BadRequestException('지금은 핀볼 접수 시간이 아닙니다.');
    }

    const saved = await this.gameEntryRepository.save(
      this.gameEntryRepository.create({
        gameSlug,
        displayName: normalizedName,
        submittedByUserId: user.sub,
        submittedByEmail: user.email,
        isActive: true,
      }),
    );
    await this.broadcastState(gameSlug, 'entry_added');

    return {
      id: saved.id,
      displayName: saved.displayName,
      updatedAt: saved.updatedAt,
    };
  }

  async removeMyEntry(userId: number, gameSlug = DEFAULT_GAME_SLUG) {
    const entries = await this.gameEntryRepository.find({
      where: {
        gameSlug,
        submittedByUserId: userId,
        isActive: true,
      },
    });

    if (!entries.length) {
      throw new NotFoundException('제출한 핀볼을 찾지 못했습니다.');
    }

    await this.gameEntryRepository.update(
      {
        gameSlug,
        submittedByUserId: userId,
        isActive: true,
      },
      {
        isActive: false,
      },
    );
    await this.broadcastState(gameSlug, 'entry_removed');
    return { success: true, removedCount: entries.length };
  }

  async removeAdminEntry(entryId: number, gameSlug = DEFAULT_GAME_SLUG) {
    const state = await this.ensureState(gameSlug);
    if (state.submissionStatus === GameSubmissionStatus.RUNNING) {
      throw new BadRequestException(
        '추첨이 진행 중일 때는 핀볼을 삭제할 수 없습니다.',
      );
    }

    const entry = await this.gameEntryRepository.findOne({
      where: {
        id: entryId,
        gameSlug,
        isActive: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('삭제할 핀볼을 찾지 못했습니다.');
    }

    entry.isActive = false;
    await this.gameEntryRepository.save(entry);
    await this.broadcastState(gameSlug, 'entry_removed');
    return { success: true };
  }

  async updateSubmissionStatus(
    submissionStatus: GameSubmissionStatus.OPEN | GameSubmissionStatus.CLOSED,
    gameSlug = DEFAULT_GAME_SLUG,
  ) {
    const state = await this.ensureState(gameSlug);
    if (state.submissionStatus === GameSubmissionStatus.RUNNING) {
      throw new BadRequestException(
        '추첨이 진행 중일 때는 접수 상태를 변경할 수 없습니다.',
      );
    }

    state.submissionStatus = submissionStatus;
    if (submissionStatus === GameSubmissionStatus.OPEN) {
      state.currentRoundId = null;
    }
    await this.gameEventStateRepository.save(state);
    await this.broadcastState(gameSlug, 'room_state_changed');
    return this.getPublicState(gameSlug);
  }

  async startRound(gameSlug = DEFAULT_GAME_SLUG) {
    const state = await this.ensureState(gameSlug);
    if (state.submissionStatus === GameSubmissionStatus.RUNNING) {
      throw new BadRequestException('이미 추첨이 진행 중입니다.');
    }

    const entries = await this.findActiveEntries(gameSlug);
    if (entries.length === 0) {
      throw new BadRequestException('참가한 핀볼이 없어 시작할 수 없습니다.');
    }

    state.submissionStatus = GameSubmissionStatus.LOCKED;
    await this.gameEventStateRepository.save(state);
    await this.broadcastState(gameSlug, 'round_locked');

    const snapshotEntries = entries.map((entry) => entry.displayName);
    const seed = randomUUID();
    const startedAt = new Date();
    const winnerRank = this.resolveWinnerRank(
      state.winnerMode,
      state.customWinnerRank,
      snapshotEntries.length,
    );
    const winnerName = snapshotEntries[winnerRank];

    const round = await this.gameRoundRepository.save(
      this.gameRoundRepository.create({
        gameSlug,
        status: GameRoundStatus.RUNNING,
        snapshotEntries,
        seed,
        winnerName,
        winnerMode: state.winnerMode,
        winnerRank,
        entryCount: snapshotEntries.length,
        startedAt,
        revealAt: null,
        finishedAt: null,
      }),
    );

    state.submissionStatus = GameSubmissionStatus.RUNNING;
    state.currentRoundId = round.id;
    await this.gameEventStateRepository.save(state);
    await this.broadcastState(gameSlug, 'round_started');
    return this.getPublicState(gameSlug);
  }

  async resetEvent(
    gameSlug = DEFAULT_GAME_SLUG,
    options: { clearEntries?: boolean } = {},
  ) {
    const state = await this.ensureState(gameSlug);

    if (state.currentRoundId) {
      const round = await this.gameRoundRepository.findOne({
        where: { id: state.currentRoundId },
      });

      if (round && round.status === GameRoundStatus.RUNNING) {
        round.status = GameRoundStatus.FINISHED;
        round.finishedAt = new Date();
        await this.gameRoundRepository.save(round);
      }
    }

    if (options.clearEntries) {
      await this.gameEntryRepository.update({ gameSlug }, { isActive: false });
    }

    state.submissionStatus = GameSubmissionStatus.CLOSED;
    state.currentRoundId = null;
    await this.gameEventStateRepository.save(state);

    await this.broadcastState(gameSlug, 'room_reset');
    return this.getPublicState(gameSlug);
  }

  async getAdminEntries(gameSlug = DEFAULT_GAME_SLUG) {
    return this.gameEntryRepository.find({
      where: {
        gameSlug,
        isActive: true,
      },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  stream(gameSlug = DEFAULT_GAME_SLUG): Observable<BroadcastEvent> {
    return merge(
      this.events$.asObservable(),
      interval(15000).pipe(
        map(() => ({
          type: 'ping',
          data: { gameSlug, timestamp: new Date().toISOString() },
        })),
      ),
    ).pipe(
      filter((event) => {
        if (event.type === 'ping') {
          return true;
        }

        const payload = event.data as { gameSlug?: string };
        return payload?.gameSlug === gameSlug;
      }),
    );
  }

  private async findActiveEntries(gameSlug: string) {
    return this.gameEntryRepository.find({
      where: {
        gameSlug,
        isActive: true,
      },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  private async findCurrentRound(gameSlug: string) {
    const state = await this.ensureState(gameSlug);
    if (state.currentRoundId) {
      const round = await this.gameRoundRepository.findOne({
        where: { id: state.currentRoundId },
      });

      return this.finalizeRevealedRound(state, round);
    }

    return null;
  }

  private async finalizeRevealedRound(
    state: GameEventState,
    round: GameRound | null,
  ) {
    const revealAtTime = round?.revealAt
      ? new Date(round.revealAt).getTime()
      : null;

    if (
      !round ||
      round.status !== GameRoundStatus.RUNNING ||
      revealAtTime === null ||
      !Number.isFinite(revealAtTime) ||
      revealAtTime > Date.now()
    ) {
      return round;
    }

    const finishedAt = new Date();
    round.status = GameRoundStatus.FINISHED;
    round.finishedAt = finishedAt;
    state.submissionStatus = GameSubmissionStatus.FINISHED;

    await Promise.all([
      this.gameRoundRepository.save(round),
      this.gameEventStateRepository.save(state),
    ]);

    return round;
  }

  private serializeRound(round: GameRound | null) {
    if (!round) {
      return null;
    }

    return {
      id: round.id,
      status: round.status,
      snapshotEntries: round.snapshotEntries || [],
      seed: round.seed,
      entryCount: round.entryCount,
      winnerMode: round.winnerMode || GameWinnerMode.FIRST,
      winnerRank:
        typeof round.winnerRank === 'number'
          ? round.winnerRank
          : this.resolveWinnerRank(
              round.winnerMode || GameWinnerMode.FIRST,
              1,
              round.entryCount,
            ),
      startedAt: round.startedAt,
      revealAt: round.revealAt,
      finishedAt: round.finishedAt,
      winnerName: round.winnerName,
    };
  }

  private resolveWinnerRank(
    winnerMode: GameWinnerMode,
    customWinnerRank: number,
    entryCount: number,
  ) {
    if (entryCount <= 0) {
      return 0;
    }

    if (winnerMode === GameWinnerMode.LAST) {
      return entryCount - 1;
    }

    if (winnerMode === GameWinnerMode.CUSTOM) {
      return Math.min(entryCount - 1, Math.max(0, customWinnerRank - 1));
    }

    return 0;
  }

  private async ensureState(gameSlug: string) {
    let state = await this.gameEventStateRepository.findOne({
      where: { gameSlug },
    });

    if (!state) {
      state = await this.gameEventStateRepository.save(
        this.gameEventStateRepository.create({
          gameSlug,
          submissionStatus: GameSubmissionStatus.CLOSED,
          currentRoundId: null,
          winnerMode: GameWinnerMode.FIRST,
          customWinnerRank: 1,
        }),
      );
    }

    return state;
  }

  private async broadcastState(gameSlug: string, type: string) {
    this.events$.next({
      type,
      data: {
        gameSlug,
        state: await this.getPublicState(gameSlug),
      },
    });
  }
}
