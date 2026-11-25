import {
  BadRequestException,
  Injectable,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Server as HttpServer } from 'http';
import { Subject } from 'rxjs';
import { Repository } from 'typeorm';
import { WebSocket, WebSocketServer } from 'ws';
import { LazygyuEntry } from './lazygyu-entry.entity';
import { FinishLazygyuRoundDto } from './dto/finish-lazygyu-round.dto';
import { UpdateLazygyuControlDto } from './dto/update-lazygyu-control.dto';
import { LazygyuRoom } from './lazygyu-room.entity';

type FramePayload = {
  buffer: Buffer;
  contentType: string;
  sequence: number;
  updatedAt: Date;
};

type LazygyuViewer = {
  clientKey: string | null;
  userEmail: string | null;
  userId: number | null;
};

const DEFAULT_MAX_ENTRIES_PER_VIEWER = 2;

@Injectable()
export class LazygyuRoomService {
  private readonly events$ = new Subject<MessageEvent>();
  private latestFrame: FramePayload | null = null;
  private frameSocketServer: WebSocketServer | null = null;
  private readonly frameClients = new Set<WebSocket>();

  constructor(
    @InjectRepository(LazygyuRoom)
    private readonly roomRepository: Repository<LazygyuRoom>,
    @InjectRepository(LazygyuEntry)
    private readonly entryRepository: Repository<LazygyuEntry>,
  ) {}

  events() {
    return this.events$.asObservable();
  }

  getMaxEntriesPerViewer() {
    const value = Number(process.env.LAZYGYU_MAX_ENTRIES_PER_PERSON || '');
    if (!Number.isFinite(value) || value < 1) {
      return DEFAULT_MAX_ENTRIES_PER_VIEWER;
    }

    return Math.floor(value);
  }

  attachFrameSocketServer(server: HttpServer) {
    if (this.frameSocketServer) {
      return;
    }

    const socketServer = new WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
    });

    server.on('upgrade', (request, socket, head) => {
      const requestUrl = request.url || '';
      if (!requestUrl.startsWith('/api/lazygyu-room/frame-stream')) {
        return;
      }

      socketServer.handleUpgrade(request, socket, head, (client) => {
        socketServer.emit('connection', client, request);
      });
    });

    socketServer.on('connection', (client) => {
      this.frameClients.add(client);

      client.on('close', () => {
        this.frameClients.delete(client);
      });

      client.on('error', () => {
        this.frameClients.delete(client);
      });

      if (this.latestFrame && client.readyState === WebSocket.OPEN) {
        client.send(this.latestFrame.buffer, { binary: true });
      }
    });

    this.frameSocketServer = socketServer;
  }

  async getPublicState(viewer?: LazygyuViewer) {
    const room = await this.ensureRoom();
    const entries = await this.getActiveEntries();

    return this.serializeState(room, entries, viewer);
  }

  async addEntry(displayName: string, viewer?: LazygyuViewer) {
    const room = await this.ensureRoom();
    if (!room.submissionsOpen || room.status === 'running') {
      throw new BadRequestException('현재는 공을 넣을 수 없습니다.');
    }

    const normalizedName = displayName.trim();
    if (!normalizedName) {
      throw new BadRequestException('이름을 입력해주세요.');
    }

    const entryCountForViewer = await this.countEntriesForViewer(viewer);
    if (entryCountForViewer >= this.getMaxEntriesPerViewer()) {
      throw new BadRequestException(
        `한 사람당 최대 ${this.getMaxEntriesPerViewer()}개까지만 넣을 수 있습니다.`,
      );
    }

    const entry = await this.entryRepository.save(
      this.entryRepository.create({
        roomSlug: room.slug,
        displayName: normalizedName,
        submittedByUserId: viewer?.userId ?? null,
        submittedByEmail: viewer?.userEmail ?? null,
        submittedByClientKey: viewer?.clientKey ?? null,
      }),
    );

    await this.bumpRoomVersion(room);
    await this.emitState('entry_added');

    return entry;
  }

  async getAdminState() {
    return this.getPublicState();
  }

  async updateControls(dto: UpdateLazygyuControlDto) {
    const room = await this.ensureRoom();

    if (typeof dto.submissionsOpen === 'boolean') {
      room.submissionsOpen = dto.submissionsOpen;
      if (room.status !== 'running' && room.status !== 'finished') {
        room.status = dto.submissionsOpen ? 'open' : 'closed';
      }
    }

    if (typeof dto.skillsEnabled === 'boolean') {
      room.skillsEnabled = dto.skillsEnabled;
    }

    if (dto.winnerMode) {
      room.winnerMode = dto.winnerMode;
    }

    if (dto.nthWinner) {
      room.nthWinner = dto.nthWinner;
    }

    room.activeWinnerRank = await this.resolveWinnerRank(room);
    await this.roomRepository.save(room);
    await this.bumpRoomVersion(room);
    await this.emitState('room_updated');

    return this.getPublicState();
  }

  async startRound() {
    const room = await this.ensureRoom();
    const entries = await this.getActiveEntries();

    if (!entries.length) {
      throw new BadRequestException('시작할 공이 없습니다.');
    }

    if (!room.streamActive || !this.latestFrame) {
      throw new BadRequestException(
        '호스트 화면 송출이 준비되지 않았습니다. 호스트 화면을 먼저 켜주세요.',
      );
    }

    room.submissionsOpen = false;
    room.status = 'running';
    room.officialWinnerName = null;
    room.roundSnapshot = entries.map((entry) => ({
      id: entry.id,
      displayName: entry.displayName,
    }));
    room.activeWinnerRank = this.computeWinnerRank(room, entries.length);

    await this.roomRepository.save(room);
    await this.bumpRoomVersion(room);
    await this.emitState('round_started');

    return this.getPublicState();
  }

  async finishRound(dto: FinishLazygyuRoundDto) {
    const room = await this.ensureRoom();
    room.status = 'finished';
    room.submissionsOpen = false;
    room.officialWinnerName = dto.winnerName.trim();
    await this.roomRepository.save(room);
    await this.bumpRoomVersion(room);
    await this.emitState('round_finished');
    return this.getPublicState();
  }

  async resetRoom() {
    const room = await this.ensureRoom();

    await this.entryRepository
      .createQueryBuilder()
      .update(LazygyuEntry)
      .set({ status: 'used' })
      .where('roomSlug = :roomSlug', { roomSlug: room.slug })
      .andWhere('status = :status', { status: 'active' })
      .execute();

    room.status = 'closed';
    room.submissionsOpen = false;
    room.officialWinnerName = null;
    room.roundSnapshot = null;
    room.activeWinnerRank = 1;
    await this.roomRepository.save(room);

    await this.bumpRoomVersion(room);
    await this.emitState('room_reset');
    return this.getPublicState();
  }

  async removeEntry(entryId: number) {
    const entry = await this.entryRepository.findOne({
      where: { id: entryId, roomSlug: 'main', status: 'active' },
    });

    if (!entry) {
      throw new NotFoundException('공 항목을 찾지 못했습니다.');
    }

    entry.status = 'removed';
    await this.entryRepository.save(entry);

    const room = await this.ensureRoom();
    room.activeWinnerRank = await this.resolveWinnerRank(room);
    await this.roomRepository.save(room);
    await this.bumpRoomVersion(room);
    await this.emitState('entry_removed');
    return this.getPublicState();
  }

  async storeFrame(buffer: Buffer, contentType: string) {
    const room = await this.ensureRoom();
    const shouldEmitStreamStarted = !room.streamActive;
    const nextSequence = (this.latestFrame?.sequence ?? 0) + 1;
    const updatedAt = new Date();

    this.latestFrame = {
      buffer,
      contentType,
      sequence: nextSequence,
      updatedAt,
    };

    room.streamActive = true;
    room.lastFrameSequence = nextSequence;
    room.lastFrameAt = updatedAt;
    await this.roomRepository.save(room);
    this.broadcastFrame(buffer);
    if (shouldEmitStreamStarted) {
      await this.emitState('stream_started');
    }
  }

  async stopStream() {
    const room = await this.ensureRoom();
    room.streamActive = false;
    await this.roomRepository.save(room);
    await this.bumpRoomVersion(room);
    await this.emitState('stream_stopped');
    return this.getPublicState();
  }

  getLatestFrame() {
    return this.latestFrame;
  }

  private async ensureRoom() {
    let room = await this.roomRepository.findOne({ where: { slug: 'main' } });
    if (room) {
      return room;
    }

    room = this.roomRepository.create({
      slug: 'main',
      status: 'closed',
      submissionsOpen: false,
      skillsEnabled: true,
      winnerMode: 'first',
      nthWinner: 1,
      activeWinnerRank: 1,
      streamActive: false,
      officialWinnerName: null,
      roundSnapshot: null,
      version: 1,
      lastFrameSequence: 0,
      lastFrameAt: null,
    });

    return this.roomRepository.save(room);
  }

  private async getActiveEntries() {
    return this.entryRepository.find({
      where: { roomSlug: 'main', status: 'active' },
      order: { id: 'ASC' },
    });
  }

  private async countEntriesForViewer(viewer?: LazygyuViewer) {
    if (viewer?.userId) {
      return this.entryRepository.count({
        where: {
          roomSlug: 'main',
          status: 'active',
          submittedByUserId: viewer.userId,
        },
      });
    }

    if (viewer?.clientKey) {
      return this.entryRepository.count({
        where: {
          roomSlug: 'main',
          status: 'active',
          submittedByClientKey: viewer.clientKey,
        },
      });
    }

    return 0;
  }

  private serializeState(
    room: LazygyuRoom,
    entries: LazygyuEntry[],
    viewer?: LazygyuViewer,
  ) {
    const viewerEntryCount = entries.filter((entry) => {
      if (viewer?.userId) {
        return entry.submittedByUserId === viewer.userId;
      }

      if (viewer?.clientKey) {
        return entry.submittedByClientKey === viewer.clientKey;
      }

      return false;
    }).length;

    return {
      slug: room.slug,
      status: room.status,
      submissionsOpen: room.submissionsOpen,
      skillsEnabled: room.skillsEnabled,
      winnerMode: room.winnerMode,
      nthWinner: room.nthWinner,
      activeWinnerRank: room.activeWinnerRank,
      streamActive: room.streamActive,
      officialWinnerName: room.officialWinnerName,
      maxEntriesPerPerson: this.getMaxEntriesPerViewer(),
      viewerEntryCount,
      version: room.version,
      snapshotEntries: room.roundSnapshot ?? [],
      entries: entries.map((entry) => ({
        id: entry.id,
        displayName: entry.displayName,
        createdAt: entry.createdAt,
      })),
      frame: this.latestFrame
        ? {
            sequence: this.latestFrame.sequence,
            updatedAt: this.latestFrame.updatedAt,
          }
        : null,
    };
  }

  private computeWinnerRank(room: LazygyuRoom, entryCount: number) {
    if (entryCount <= 0) {
      return 1;
    }

    if (room.winnerMode === 'last') {
      return entryCount;
    }

    if (room.winnerMode === 'nth') {
      return Math.min(Math.max(room.nthWinner, 1), entryCount);
    }

    return 1;
  }

  private async resolveWinnerRank(room: LazygyuRoom) {
    const entryCount = await this.entryRepository.count({
      where: { roomSlug: 'main', status: 'active' },
    });
    return this.computeWinnerRank(room, entryCount);
  }

  private async bumpRoomVersion(room: LazygyuRoom) {
    room.version += 1;
    await this.roomRepository.save(room);
  }

  private async emitState(type: string) {
    const state = await this.getPublicState();
    this.events$.next({
      id: `${type}:${state.version}`,
      data: state,
    });
  }

  private broadcastFrame(buffer: Buffer) {
    if (!this.frameClients.size) {
      return;
    }

    for (const client of this.frameClients) {
      if (client.readyState !== WebSocket.OPEN) {
        this.frameClients.delete(client);
        continue;
      }

      client.send(buffer, { binary: true }, () => {
        if (client.readyState !== WebSocket.OPEN) {
          this.frameClients.delete(client);
        }
      });
    }
  }
}
