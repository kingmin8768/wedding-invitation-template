import { BadRequestException } from '@nestjs/common';
import { GamesService } from './games.service';
import { GameSubmissionStatus } from './game-event-state.entity';
import { GameRoundStatus } from './game-round.entity';

const sortByCreatedAt = (items) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    if (leftTime === rightTime) {
      return (left.id || 0) - (right.id || 0);
    }
    return leftTime - rightTime;
  });

const matchesWhere = (entity, where = {}) =>
  Object.entries(where).every(([key, value]) => entity[key] === value);

const createRepository = () => {
  const store = [];
  let nextId = 1;

  return {
    store,
    create(payload) {
      return { ...payload };
    },
    async findOne({ where }) {
      return store.find((item) => matchesWhere(item, where)) || null;
    },
    async find({
      where,
      order,
    }: {
      where?: Record<string, unknown>;
      order?: Record<string, string>;
    } = {}) {
      let items = where
        ? store.filter((item) => matchesWhere(item, where))
        : [...store];

      if (order?.createdAt || order?.id) {
        items = sortByCreatedAt(items);
      }

      if (order?.createdAt === 'DESC') {
        items.reverse();
      }

      return items;
    },
    async save(entity) {
      if (!entity.id) {
        entity.id = nextId++;
        entity.createdAt = entity.createdAt || new Date();
      }

      entity.updatedAt = new Date();
      const index = store.findIndex((item) => item.id === entity.id);
      if (index >= 0) {
        store[index] = { ...store[index], ...entity };
        return store[index];
      }

      store.push(entity);
      return entity;
    },
    async update(criteria, partial) {
      store.forEach((item, index) => {
        if (matchesWhere(item, criteria)) {
          store[index] = {
            ...item,
            ...partial,
            updatedAt: new Date(),
          };
        }
      });
    },
  };
};

describe('GamesService', () => {
  let service;
  let jwtService;
  let entryRepository;
  let stateRepository;
  let roundRepository;

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('host-ticket'),
    };
    entryRepository = createRepository();
    stateRepository = createRepository();
    roundRepository = createRepository();

    service = new GamesService(
      jwtService,
      entryRepository,
      stateRepository,
      roundRepository,
    );
  });

  it('rejects entry submission when the event is closed', async () => {
    await stateRepository.save({
      gameSlug: 'lazygyu',
      submissionStatus: GameSubmissionStatus.CLOSED,
      currentRoundId: null,
    });

    await expect(
      service.upsertEntry({ sub: 1, email: 'guest@example.com' }, '민수 핀볼'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores one active entry per user and exposes it in public state', async () => {
    await stateRepository.save({
      gameSlug: 'lazygyu',
      submissionStatus: GameSubmissionStatus.OPEN,
      currentRoundId: null,
    });

    await service.upsertEntry(
      { sub: 7, email: 'guest@example.com' },
      '민수 핀볼',
    );

    const publicState = await service.getPublicState();

    expect(publicState.entryCount).toBe(1);
    expect(publicState.entries[0].displayName).toBe('민수 핀볼');
  });

  it('finalizes an expired round when state is fetched again', async () => {
    await stateRepository.save({
      gameSlug: 'lazygyu',
      submissionStatus: GameSubmissionStatus.OPEN,
      currentRoundId: null,
    });

    await service.upsertEntry({ sub: 1, email: 'a@example.com' }, 'A');
    await service.upsertEntry({ sub: 2, email: 'b@example.com' }, 'B');
    await service.startRound();

    const runningRound = roundRepository.store[0];
    runningRound.revealAt = new Date(Date.now() - 1000);

    const publicState = await service.getPublicState();

    expect(publicState.submissionStatus).toBe(GameSubmissionStatus.FINISHED);
    expect(publicState.round.status).toBe(GameRoundStatus.FINISHED);
    expect(publicState.round.winnerName).toBeTruthy();

    await service.resetEvent('lazygyu');
  });
});
