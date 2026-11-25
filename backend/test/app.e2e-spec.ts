import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { existsSync } from 'fs';
import { rmSync } from 'fs';
import { join } from 'path';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { Asset } from '../src/assets/asset.entity';
import { ConfigService } from '../src/auth/services/config.service';
import { GameEntry } from '../src/games/game-entry.entity';
import { Guestbook } from '../src/guestbook/guestbook.entity';

const JPEG_FIXTURE = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00]);
const PDF_FIXTURE = Buffer.from('%PDF-1.4\n%fixture');
const HTML_FIXTURE = Buffer.from(
  '<!doctype html><html><body>owned</body></html>',
);

describe('Auth and admin flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const dbPath = join(process.cwd(), 'test', 'test-auth.sqlite');
  const uploadRoot = join(process.cwd(), 'test', 'uploads');

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DB_DRIVER = 'sqlite';
    process.env.DB_PATH = dbPath;
    process.env.UPLOAD_ROOT = uploadRoot;
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.ADMIN_EMAIL = 'admin@test.local';
    process.env.ADMIN_PASSWORD = 'admin1234';
    rmSync(dbPath, { force: true });
    rmSync(uploadRoot, { force: true, recursive: true });
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    if (app) {
      await app.close();
    }
  });

  afterAll(() => {
    rmSync(dbPath, { force: true });
    rmSync(uploadRoot, { force: true, recursive: true });
  });

  it('supports signup, login, refresh, me, and admin protection', async () => {
    const email = `guest-${Date.now()}@test.local`;
    const password = 'password123';
    const memberAgent = request.agent(app.getHttpServer());
    const adminAgent = request.agent(app.getHttpServer());

    const signupResponse = await memberAgent
      .post('/api/auth/signup')
      .send({ email, password })
      .expect(201);

    expect(signupResponse.body.user.email).toBe(email);
    expect(signupResponse.body.user.role).toBe('user');
    expect(signupResponse.body.accessToken).toBeUndefined();
    expect(signupResponse.body.refreshToken).toBeUndefined();
    expect(signupResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('weddingInvitationAccessToken='),
        expect.stringContaining('weddingInvitationRefreshToken='),
      ]),
    );

    const loginResponse = await memberAgent
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);
    expect(loginResponse.body.accessToken).toBeUndefined();
    expect(loginResponse.body.refreshToken).toBeUndefined();

    const meResponse = await memberAgent.get('/api/auth/me').expect(200);

    expect(meResponse.body.email).toBe(email);
    expect(meResponse.body.role).toBe('user');

    const refreshResponse = await memberAgent
      .post('/api/auth/refresh')
      .expect(201);

    expect(refreshResponse.body.accessToken).toBeUndefined();
    expect(refreshResponse.body.refreshToken).toBeUndefined();
    expect(refreshResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('weddingInvitationAccessToken='),
        expect.stringContaining('weddingInvitationRefreshToken='),
      ]),
    );

    await memberAgent.get('/api/admin/overview').expect(403);

    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    const adminOverviewResponse = await adminAgent
      .get('/api/admin/overview')
      .expect(200);

    expect(adminOverviewResponse.body.user.email).toBe(process.env.ADMIN_EMAIL);
    expect(adminOverviewResponse.body.user.role).toBe('admin');
  });

  it('supports guestbook moderation and admin asset uploads', async () => {
    await request(app.getHttpServer())
      .post('/api/guestbook')
      .send({
        name: '축하손님',
        password: 'guest1234',
        message: '정말 축하드립니다.',
      })
      .expect(201);

    const storedGuestbookEntry = await dataSource
      .getRepository(Guestbook)
      .findOne({
        where: { name: '축하손님' },
        order: { id: 'DESC' },
      });

    expect(storedGuestbookEntry).not.toBeNull();
    expect(storedGuestbookEntry?.password).not.toBe('guest1234');
    expect(storedGuestbookEntry?.password.startsWith('$2')).toBe(true);

    const publicGuestbookBefore = await request(app.getHttpServer())
      .get('/api/guestbook')
      .expect(200);

    expect(publicGuestbookBefore.body).toHaveLength(1);
    expect(publicGuestbookBefore.body[0].password).toBeUndefined();

    const adminAgent = request.agent(app.getHttpServer());

    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    const adminGuestbookList = await adminAgent
      .get('/api/guestbook/admin')
      .expect(200);

    expect(adminGuestbookList.body).toHaveLength(1);

    const hiddenEntry = await adminAgent
      .patch(`/api/guestbook/${adminGuestbookList.body[0].id}/visibility`)
      .send({ isHidden: true })
      .expect(200);

    expect(hiddenEntry.body.isHidden).toBe(true);

    const publicGuestbookAfterHide = await request(app.getHttpServer())
      .get('/api/guestbook')
      .expect(200);

    expect(publicGuestbookAfterHide.body).toHaveLength(0);

    await adminAgent
      .patch(`/api/guestbook/${adminGuestbookList.body[0].id}/visibility`)
      .send({ isHidden: false })
      .expect(200);

    const publicGuestbookAfterRestore = await request(app.getHttpServer())
      .get('/api/guestbook')
      .expect(200);

    expect(publicGuestbookAfterRestore.body).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/api/guestbook/${adminGuestbookList.body[0].id}`)
      .send({ password: 'wrong-password' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/guestbook/${adminGuestbookList.body[0].id}`)
      .send({ password: 'guest1234' })
      .expect(200);

    await request(app.getHttpServer()).get('/api/guestbook').expect(200, []);

    const uploadResponse = await adminAgent
      .post('/api/assets/admin/upload')
      .field('title', '주차 안내')
      .field('category', 'invitation')
      .attach('file', PDF_FIXTURE, 'parking-guide.pdf')
      .expect(201);

    expect(uploadResponse.body.title).toBe('주차 안내');
    expect(uploadResponse.body.publicUrl).toContain('/uploads/invitation/');

    const publicAssets = await request(app.getHttpServer())
      .get('/api/assets/invitation')
      .expect(200);

    expect(publicAssets.body).toHaveLength(1);
    expect(publicAssets.body[0].title).toBe('주차 안내');

    await adminAgent
      .post('/api/assets/admin/upload')
      .field('title', '악성 파일')
      .field('category', 'invitation')
      .attach('file', HTML_FIXTURE, {
        filename: 'evil.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
  });

  it('supports deleting legacy plaintext guestbook entries during migration', async () => {
    const legacyEntry = await dataSource.getRepository(Guestbook).save({
      name: '레거시 손님',
      password: 'legacy-pass',
      message: '예전 데이터입니다.',
    });

    await request(app.getHttpServer())
      .delete(`/api/guestbook/${legacyEntry.id}`)
      .send({ password: 'wrong-pass' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/guestbook/${legacyEntry.id}`)
      .send({ password: 'legacy-pass' })
      .expect(200);

    await request(app.getHttpServer()).get('/api/guestbook').expect(200, []);
  });

  it('blocks anonymous RSVP listing', async () => {
    await request(app.getHttpServer()).get('/api/rsvp').expect(401);
  });

  it('allows only admins to view RSVP listing', async () => {
    const memberEmail = `rsvp-member-${Date.now()}@test.local`;
    const password = 'password123';
    const memberAgent = request.agent(app.getHttpServer());
    const adminAgent = request.agent(app.getHttpServer());

    await request(app.getHttpServer())
      .post('/api/rsvp')
      .send({
        name: '참석 손님',
        side: 'groom',
        attendance: 'yes',
        afterPartyAttendance: 'yes',
        meal: 'yes',
        guests: 2,
      })
      .expect(201);

    await memberAgent
      .post('/api/auth/signup')
      .send({ email: memberEmail, password })
      .expect(201);

    await memberAgent.get('/api/rsvp').expect(403);

    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    const response = await adminAgent.get('/api/rsvp').expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      name: '참석 손님',
      side: 'groom',
      attendance: 'yes',
      afterPartyAttendance: 'yes',
      meal: 'yes',
      guests: 2,
    });
  });

  it('supports member photo uploads with admin approval and hide flow', async () => {
    const memberEmail = `photo-${Date.now()}@test.local`;
    const password = 'password123';
    const memberAgent = request.agent(app.getHttpServer());
    const adminAgent = request.agent(app.getHttpServer());

    await memberAgent
      .post('/api/auth/signup')
      .send({ email: memberEmail, password })
      .expect(201);

    await memberAgent
      .post('/api/assets/shared-photos/upload')
      .field('title', '하객 현장 사진')
      .attach('file', JPEG_FIXTURE, 'guest-photo.jpg')
      .expect(201);

    const myUploads = await memberAgent
      .get('/api/assets/mine/shared-photos')
      .expect(200);

    expect(myUploads.body).toHaveLength(1);
    expect(myUploads.body[0].moderationStatus).toBe('pending');

    await request(app.getHttpServer())
      .get('/api/assets/shared-photos')
      .expect(200, []);

    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    const photoQueue = await adminAgent
      .get('/api/assets/admin?category=shared-photo')
      .expect(200);

    expect(photoQueue.body).toHaveLength(1);

    const approvedPhoto = await adminAgent
      .patch(`/api/assets/${photoQueue.body[0].id}/approve`)
      .expect(200);

    expect(approvedPhoto.body.moderationStatus).toBe('approved');
    expect(approvedPhoto.body.isVisible).toBe(true);

    const publicPhotosAfterApprove = await request(app.getHttpServer())
      .get('/api/assets/shared-photos')
      .expect(200);

    expect(publicPhotosAfterApprove.body).toHaveLength(1);
    expect(publicPhotosAfterApprove.body[0].uploaderEmail).toBeUndefined();

    await adminAgent
      .patch(`/api/assets/${photoQueue.body[0].id}/visibility`)
      .send({ isVisible: false })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/assets/shared-photos')
      .expect(200, []);

    await memberAgent
      .post('/api/assets/shared-photos/upload')
      .field('title', '악성 공유 파일')
      .attach('file', HTML_FIXTURE, {
        filename: 'shared-photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    await memberAgent
      .post('/api/assets/shared-photos/upload')
      .field('title', '위험 확장자')
      .attach('file', JPEG_FIXTURE, {
        filename: 'dangerous.html',
        contentType: 'image/jpeg',
      })
      .expect(400);
  });

  it('supports assigning invitation images to slots with public fallback payload', async () => {
    const adminAgent = request.agent(app.getHttpServer());

    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    const firstHeroAssignment = await adminAgent
      .post('/api/invitation-media/admin/assign')
      .field('slot', 'hero')
      .field('caption', '메인 이미지')
      .field('targetUrl', 'https://example.com/hero')
      .attach('file', JPEG_FIXTURE, 'hero-image.jpg')
      .expect(201);

    expect(firstHeroAssignment.body.slot).toBe('hero');
    expect(firstHeroAssignment.body.asset.title).toBe('메인 이미지');

    await adminAgent
      .post('/api/invitation-media/admin/assign')
      .field('slot', 'gallery')
      .field('caption', '갤러리 2')
      .field('displayOrder', '2')
      .attach('file', JPEG_FIXTURE, 'gallery-b.jpg')
      .expect(201);

    const galleryAssignmentA = await adminAgent
      .post('/api/invitation-media/admin/assign')
      .field('slot', 'gallery')
      .field('caption', '갤러리 1')
      .field('displayOrder', '1')
      .attach('file', JPEG_FIXTURE, 'gallery-a.jpg')
      .expect(201);

    const publicMedia = await request(app.getHttpServer())
      .get('/api/invitation-media/public')
      .expect(200);

    expect(publicMedia.body.hero.asset.id).toBe(
      firstHeroAssignment.body.asset.id,
    );
    expect(publicMedia.body.hero.targetUrl).toBe('https://example.com/hero');
    expect(publicMedia.body.hero.asset.storedName).toBeUndefined();
    expect(publicMedia.body.couple).toBeNull();
    expect(publicMedia.body.footer).toBeNull();
    expect(publicMedia.body.gallery).toHaveLength(2);
    expect(publicMedia.body.gallery[0].asset.id).toBe(
      galleryAssignmentA.body.asset.id,
    );

    const footerAssignment = await adminAgent
      .post('/api/invitation-media/admin/assign')
      .field('slot', 'footer')
      .field('caption', '마무리 이미지')
      .field('targetUrl', 'https://example.com/footer')
      .attach('file', JPEG_FIXTURE, 'footer-image.jpg')
      .expect(201);

    expect(footerAssignment.body.slot).toBe('footer');
    expect(footerAssignment.body.asset.publicUrl).toContain(
      '/uploads/invitation/',
    );
    expect(footerAssignment.body.targetUrl).toBe('https://example.com/footer');

    const publicInvitationAssets = await request(app.getHttpServer())
      .get('/api/assets/invitation')
      .expect(200);

    expect(publicInvitationAssets.body.map((item) => item.title)).toContain(
      '주차 안내',
    );
    expect(publicInvitationAssets.body.map((item) => item.id)).not.toContain(
      footerAssignment.body.asset.id,
    );
    expect(publicInvitationAssets.body.map((item) => item.id)).not.toContain(
      firstHeroAssignment.body.asset.id,
    );
    expect(publicInvitationAssets.body.map((item) => item.id)).not.toContain(
      galleryAssignmentA.body.asset.id,
    );

    const replacementHeroAssignment = await adminAgent
      .post('/api/invitation-media/admin/assign')
      .field('slot', 'hero')
      .field('caption', '교체 메인 이미지')
      .attach('file', JPEG_FIXTURE, 'hero-image-2.jpg')
      .expect(201);

    await adminAgent
      .post('/api/invitation-media/admin/assign')
      .field('slot', 'gallery')
      .field('caption', '악성 갤러리')
      .attach('file', HTML_FIXTURE, {
        filename: 'gallery-evil.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    await adminAgent
      .post('/api/invitation-media/admin/assign')
      .field('slot', 'footer')
      .field('targetUrl', 'javascript:alert(1)')
      .attach('file', JPEG_FIXTURE, 'footer-malicious.jpg')
      .expect(400);

    const adminHeroList = await adminAgent
      .get('/api/invitation-media/admin?slot=hero')
      .expect(200);

    expect(adminHeroList.body).toHaveLength(2);
    expect(adminHeroList.body.filter((item) => item.isVisible)).toHaveLength(1);
    expect(adminHeroList.body.find((item) => item.isVisible).asset.id).toBe(
      replacementHeroAssignment.body.asset.id,
    );

    const slotItemToDelete = adminHeroList.body.find(
      (item) => item.asset.id === firstHeroAssignment.body.asset.id,
    );
    const uploadedFilePath = join(
      uploadRoot,
      'invitation',
      firstHeroAssignment.body.asset.storedName,
    );

    expect(existsSync(uploadedFilePath)).toBe(true);

    await adminAgent
      .delete(`/api/invitation-media/${slotItemToDelete.id}`)
      .expect(200);

    const deletedAsset = await dataSource.getRepository(Asset).findOne({
      where: { id: firstHeroAssignment.body.asset.id },
    });

    expect(deletedAsset).toBeNull();
    expect(existsSync(uploadedFilePath)).toBe(false);
  });

  it('supports live lazygyu room flow with synchronized state', async () => {
    const adminAgent = request.agent(app.getHttpServer());
    const firstMemberAgent = request.agent(app.getHttpServer());
    const secondMemberAgent = request.agent(app.getHttpServer());

    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    await adminAgent
      .post('/api/admin/games/lazygyu/reset')
      .send({ clearEntries: true })
      .expect(201);

    await firstMemberAgent
      .post('/api/auth/signup')
      .send({
        email: `game-first-${Date.now()}@test.local`,
        password: 'password123',
      })
      .expect(201);

    await secondMemberAgent
      .post('/api/auth/signup')
      .send({
        email: `game-second-${Date.now()}@test.local`,
        password: 'password123',
      })
      .expect(201);

    await firstMemberAgent
      .post('/api/games/lazygyu/entries')
      .send({ displayName: '빠른손' })
      .expect(400);

    await adminAgent
      .patch('/api/admin/games/lazygyu/submission')
      .send({ status: 'open' })
      .expect(200);

    await firstMemberAgent
      .post('/api/games/lazygyu/entries')
      .send({ displayName: '빠른손' })
      .expect(201);

    await firstMemberAgent
      .post('/api/games/lazygyu/entries')
      .send({ displayName: '빠른손-수정' })
      .expect(201);

    await secondMemberAgent
      .post('/api/games/lazygyu/entries')
      .send({ displayName: '우승후보' })
      .expect(201);

    const adminEntries = await adminAgent
      .get('/api/admin/games/lazygyu/entries')
      .expect(200);

    expect(adminEntries.body).toHaveLength(3);
    expect(adminEntries.body[0].displayName).toBe('빠른손');
    expect(adminEntries.body[1].displayName).toBe('빠른손-수정');

    const storedEntries = await dataSource.getRepository(GameEntry).find({
      where: { gameSlug: 'lazygyu', isActive: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    expect(storedEntries).toHaveLength(3);

    const startedState = await adminAgent
      .post('/api/admin/games/lazygyu/start')
      .expect(201);

    expect(startedState.body.submissionStatus).toBe('running');
    expect(startedState.body.round).not.toBeNull();
    expect(startedState.body.round.snapshotEntries).toHaveLength(3);
    expect(['빠른손', '빠른손-수정', '우승후보']).toContain(
      startedState.body.round.winnerName,
    );

    await new Promise((resolve) => setTimeout(resolve, 120));

    const runningState = await request(app.getHttpServer())
      .get('/api/games/lazygyu/state')
      .expect(200);

    expect(runningState.body.submissionStatus).toBe('running');
    expect(['빠른손', '빠른손-수정', '우승후보']).toContain(
      runningState.body.round.winnerName,
    );

    const resetState = await adminAgent
      .post('/api/admin/games/lazygyu/reset')
      .send({ clearEntries: true })
      .expect(201);

    expect(resetState.body.submissionStatus).toBe('closed');
    expect(resetState.body.entryCount).toBe(0);
  }, 10000);

  it('supports first, last, and custom winner modes for lazygyu room', async () => {
    const adminAgent = request.agent(app.getHttpServer());
    const memberAgent = request.agent(app.getHttpServer());
    const email = `winner-mode-${Date.now()}@test.local`;
    const password = 'password123';

    await memberAgent
      .post('/api/auth/signup')
      .send({ email, password })
      .expect(201);

    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    await adminAgent
      .post('/api/admin/games/lazygyu/reset')
      .send({ clearEntries: true })
      .expect(201);

    await adminAgent
      .patch('/api/admin/games/lazygyu/submission')
      .send({ status: 'open' })
      .expect(200);

    await memberAgent
      .post('/api/games/lazygyu/entries')
      .send({ displayName: '첫공' })
      .expect(201);
    await memberAgent
      .post('/api/games/lazygyu/entries')
      .send({ displayName: '둘공' })
      .expect(201);
    await memberAgent
      .post('/api/games/lazygyu/entries')
      .send({ displayName: '막공' })
      .expect(201);

    const firstModeState = await adminAgent
      .patch('/api/admin/games/lazygyu/winner-mode')
      .send({ winnerMode: 'first' })
      .expect(200);

    expect(firstModeState.body.winnerMode).toBe('first');

    const firstRound = await adminAgent
      .post('/api/admin/games/lazygyu/start')
      .expect(201);

    expect(firstRound.body.round.winnerMode).toBe('first');
    expect(firstRound.body.round.winnerRank).toBe(0);

    await adminAgent
      .post('/api/admin/games/lazygyu/reset')
      .send({ clearEntries: false })
      .expect(201);

    const lastModeState = await adminAgent
      .patch('/api/admin/games/lazygyu/winner-mode')
      .send({ winnerMode: 'last' })
      .expect(200);

    expect(lastModeState.body.winnerMode).toBe('last');

    const lastRound = await adminAgent
      .post('/api/admin/games/lazygyu/start')
      .expect(201);

    expect(lastRound.body.round.winnerMode).toBe('last');
    expect(lastRound.body.round.winnerRank).toBe(2);

    await adminAgent
      .post('/api/admin/games/lazygyu/reset')
      .send({ clearEntries: false })
      .expect(201);

    const customModeState = await adminAgent
      .patch('/api/admin/games/lazygyu/winner-mode')
      .send({ winnerMode: 'custom', customWinnerRank: 2 })
      .expect(200);

    expect(customModeState.body.winnerMode).toBe('custom');
    expect(customModeState.body.customWinnerRank).toBe(2);

    const customRound = await adminAgent
      .post('/api/admin/games/lazygyu/start')
      .expect(201);

    expect(customRound.body.round.winnerMode).toBe('custom');
    expect(customRound.body.round.winnerRank).toBe(1);
  }, 10000);

  it('supports public event logging, admin filtering, csv export, and overview metrics', async () => {
    const adminAgent = request.agent(app.getHttpServer());

    const eventOne = await request(app.getHttpServer())
      .post('/api/event-logs')
      .send({
        eventType: 'page_view',
        section: 'hero',
        action: 'view',
        label: '메인 화면',
        path: '/',
        sessionId: 'session-a',
        userName: '김하객',
        metadata: { durationMs: 120 },
      })
      .expect(201);

    expect(eventOne.body.eventType).toBe('page_view');
    expect(eventOne.body.section).toBe('hero');
    expect(eventOne.body.userName).toBe('김하객');

    await request(app.getHttpServer())
      .post('/api/event-logs')
      .send({
        eventType: 'section_view',
        section: 'hero-top',
        action: 'view',
        label: 'hero-top 섹션',
        path: '/',
        sessionId: 'session-a',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/event-logs')
      .send({
        eventType: 'click',
        section: 'guestbook',
        action: 'open',
        label: '방명록 작성 버튼',
        path: '/#guestbook',
        sessionId: 'session-b',
        metadata: { source: 'floating' },
      })
      .expect(201);

    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    const logListResponse = await adminAgent
      .get('/api/admin/event-logs?eventType=click&search=방명록')
      .expect(200);

    expect(logListResponse.body.meta.total).toBe(1);
    expect(logListResponse.body.items[0].eventType).toBe('click');
    expect(logListResponse.body.items[0].label).toBe('방명록 작성 버튼');

    const userNameSearchResponse = await adminAgent
      .get('/api/admin/event-logs?search=김하객')
      .expect(200);

    expect(userNameSearchResponse.body.meta.total).toBe(1);
    expect(userNameSearchResponse.body.items[0].userName).toBe('김하객');

    const csvResponse = await adminAgent
      .get('/api/admin/event-logs/export?search=김하객')
      .expect('Content-Type', /text\/csv/)
      .expect(200);

    expect(csvResponse.text).toContain('eventType');
    expect(csvResponse.text).toContain('userName');
    expect(csvResponse.text).toContain('김하객');

    await request(app.getHttpServer())
      .post('/api/event-logs')
      .send({
        eventType: 'click',
        label: '=cmd|calc',
        sessionId: 'session-c',
      })
      .expect(201);

    const sanitizedCsvResponse = await adminAgent
      .get('/api/admin/event-logs/export?search=cmd')
      .expect('Content-Type', /text\/csv/)
      .expect(200);

    expect(sanitizedCsvResponse.text).toContain("'=cmd|calc");

    const overviewResponse = await adminAgent
      .get('/api/admin/overview')
      .expect(200);

    expect(
      overviewResponse.body.metrics.events.totalEvents,
    ).toBeGreaterThanOrEqual(2);
    expect(
      overviewResponse.body.metrics.events.last24hEvents,
    ).toBeGreaterThanOrEqual(2);
    expect(
      overviewResponse.body.metrics.events.topEventTypes[0].eventType,
    ).toBeDefined();
    expect(
      overviewResponse.body.metrics.events.topSections.find(
        (item) => item.section === 'hero-top',
      ),
    ).toBeDefined();
    expect(
      overviewResponse.body.metrics.events.recentEvents.length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('auto-generates and persists auth secrets in production when env vars are missing', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAccessSecret = process.env.JWT_ACCESS_SECRET;
    const previousRefreshSecret = process.env.JWT_REFRESH_SECRET;
    const runtimeSecretsPath = join(
      process.cwd(),
      'test',
      '.runtime-secrets.json',
    );

    try {
      rmSync(runtimeSecretsPath, { force: true });
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const prodApp = moduleFixture.createNestApplication();
      await configureApp(prodApp);

      const configService = prodApp.get(ConfigService);
      expect(configService.accessTokenSecret).toHaveLength(64);
      expect(configService.refreshTokenSecret).toHaveLength(64);
      expect(existsSync(runtimeSecretsPath)).toBe(true);

      await prodApp.close().catch(() => {});
    } finally {
      rmSync(runtimeSecretsPath, { force: true });
      process.env.NODE_ENV = previousNodeEnv;
      process.env.JWT_ACCESS_SECRET = previousAccessSecret;
      process.env.JWT_REFRESH_SECRET = previousRefreshSecret;
    }
  });

  it('allows logout to revoke the refresh session even after the access cookie expires', async () => {
    const previousAccessExpiry = process.env.JWT_ACCESS_EXPIRES_IN;
    process.env.JWT_ACCESS_EXPIRES_IN = '1s';

    let shortLivedApp: INestApplication | null = null;

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      shortLivedApp = moduleFixture.createNestApplication();
      await configureApp(shortLivedApp);
      await shortLivedApp.init();

      const agent = request.agent(shortLivedApp.getHttpServer());
      const email = `logout-${Date.now()}@test.local`;
      const password = 'password123';

      await agent
        .post('/api/auth/signup')
        .send({ email, password })
        .expect(201);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      await agent.post('/api/auth/logout').send({}).expect(201);

      await agent.post('/api/auth/refresh').send({}).expect(401);
    } finally {
      if (previousAccessExpiry === undefined) {
        delete process.env.JWT_ACCESS_EXPIRES_IN;
      } else {
        process.env.JWT_ACCESS_EXPIRES_IN = previousAccessExpiry;
      }
      if (shortLivedApp) {
        await shortLivedApp.close();
      }
    }
  });

  it('treats malformed auth cookies as invalid instead of crashing', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', 'weddingInvitationAccessToken=%E0%A4%A')
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', 'weddingInvitationRefreshToken=%E0%A4%A')
      .send({})
      .expect(401);
  });

  it('sets cross-origin session cookies for secure production deployments', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousCorsOrigins = process.env.CORS_ALLOWED_ORIGINS;

    let prodApp: INestApplication | null = null;

    try {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://admin.example.com';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      prodApp = moduleFixture.createNestApplication();
      await configureApp(prodApp);
      await prodApp.init();

      const loginResponse = await request(prodApp.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', 'https://admin.example.com')
        .send({
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
        })
        .expect(201);

      expect(loginResponse.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringContaining('SameSite=None'),
          expect.stringContaining('Secure'),
        ]),
      );
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }

      if (previousCorsOrigins === undefined) {
        delete process.env.CORS_ALLOWED_ORIGINS;
      } else {
        process.env.CORS_ALLOWED_ORIGINS = previousCorsOrigins;
      }

      if (prodApp) {
        await prodApp.close();
      }
    }
  });

  it('applies security headers, restricts CORS, and rate-limits sensitive endpoints', async () => {
    const allowedCors = await request(app.getHttpServer())
      .options('/api/guestbook')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(allowedCors.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );

    const blockedCors = await request(app.getHttpServer())
      .options('/api/guestbook')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');

    expect(blockedCors.status).toBe(404);
    expect(blockedCors.headers['access-control-allow-origin']).toBeUndefined();

    const headersResponse = await request(app.getHttpServer())
      .get('/api/guestbook')
      .expect(200);

    expect(headersResponse.headers['content-security-policy']).toContain(
      "default-src 'self'",
    );
    expect(headersResponse.headers['content-security-policy']).toContain(
      "script-src 'self' 'wasm-unsafe-eval' https://oapi.map.naver.com https://*.pstatic.net",
    );
    expect(headersResponse.headers['x-frame-options']).toBe('DENY');
    expect(headersResponse.headers['referrer-policy']).toBe(
      'strict-origin-when-cross-origin',
    );
    expect(headersResponse.headers['x-powered-by']).toBeUndefined();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/guestbook')
        .set('X-Forwarded-For', '203.0.113.10')
        .send({
          name: `속도제한 손님 ${attempt}`,
          password: 'guest1234',
          message: '속도 제한 검증',
        })
        .expect(201);
    }

    const limitedResponse = await request(app.getHttpServer())
      .post('/api/guestbook')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({
        name: '속도제한 손님 초과',
        password: 'guest1234',
        message: '속도 제한 검증',
      })
      .expect(429);

    expect(limitedResponse.body.message).toBe(
      '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    );
    expect(limitedResponse.headers['retry-after']).toBeDefined();

    const adminAgent = request.agent(app.getHttpServer());

    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    for (let attempt = 0; attempt < 12; attempt += 1) {
      await adminAgent
        .post('/api/admin/games/lazygyu/reset')
        .send({ clearEntries: false })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/api/guestbook')
      .set('X-Forwarded-For', '203.0.113.11')
      .send({
        name: '프록시 인식 손님',
        password: 'guest1234',
        message: '프록시 인식 검증',
      })
      .expect(201);
  });

  it('supports the single-room lazygyu host control flow', async () => {
    const adminAgent = request.agent(app.getHttpServer());

    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    const initialState = await request(app.getHttpServer())
      .get('/api/lazygyu-room/state')
      .expect(200);

    expect(initialState.body.slug).toBe('main');
    expect(initialState.body.submissionsOpen).toBe(false);
    expect(initialState.body.entries).toEqual([]);

    await adminAgent
      .patch('/api/lazygyu-room/admin/control')
      .send({
        submissionsOpen: true,
        skillsEnabled: false,
        winnerMode: 'nth',
        nthWinner: 2,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/lazygyu-room/entries')
      .send({ displayName: '짱구' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/lazygyu-room/entries')
      .send({ displayName: '짱아' })
      .expect(201);

    await adminAgent
      .post('/api/lazygyu-room/admin/frame')
      .attach('frame', JPEG_FIXTURE, {
        filename: 'lazygyu-frame.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    const runningState = await adminAgent
      .post('/api/lazygyu-room/admin/start')
      .expect(201);

    expect(runningState.body.status).toBe('running');
    expect(runningState.body.snapshotEntries).toHaveLength(2);
    expect(runningState.body.activeWinnerRank).toBe(2);

    await request(app.getHttpServer())
      .get('/api/lazygyu-room/frame')
      .expect(200)
      .expect('Content-Type', /image\/jpeg/);

    const finishedState = await adminAgent
      .post('/api/lazygyu-room/admin/finish')
      .send({ winnerName: '짱아' })
      .expect(201);

    expect(finishedState.body.officialWinnerName).toBe('짱아');
    expect(finishedState.body.status).toBe('finished');

    const resetState = await adminAgent
      .post('/api/lazygyu-room/admin/reset')
      .expect(201);

    expect(resetState.body.status).toBe('closed');
    expect(resetState.body.entries).toEqual([]);
  });

  it('serves health check and allows admins to customize and reset invitation settings', async () => {
    const healthResponse = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(healthResponse.body.status).toBe('ok');

    const initialPublic = await request(app.getHttpServer())
      .get('/api/invitation-settings/public')
      .expect(200);

    expect(initialPublic.body.couple.groom.firstName).toBe('민수');

    await request(app.getHttpServer())
      .put('/api/invitation-settings/admin')
      .send({ couple: { groom: { fullName: '박준호', firstName: '준호' } } })
      .expect(401);

    const adminAgent = request.agent(app.getHttpServer());
    await adminAgent
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    const updatedResponse = await adminAgent
      .put('/api/invitation-settings/admin')
      .send({
        couple: {
          groom: { fullName: '박준호', firstName: '준호' },
          bride: { fullName: '최서연', firstName: '서연' },
        },
        venue: {
          name: '테스트 웨딩홀',
          floor: '5층 루프탑홀',
          address: '서울특별시 서초구 서초대로 100',
          lat: 37.4923,
          lng: 127.0292,
        },
      })
      .expect(200);

    expect(updatedResponse.body.couple.groom.firstName).toBe('준호');
    expect(updatedResponse.body.venue.name).toBe('테스트 웨딩홀');

    const publicAfterUpdate = await request(app.getHttpServer())
      .get('/api/invitation-settings/public')
      .expect(200);

    expect(publicAfterUpdate.body.couple.bride.firstName).toBe('서연');
    expect(publicAfterUpdate.body.venue.floor).toBe('5층 루프탑홀');

    const resetResponse = await adminAgent
      .post('/api/invitation-settings/admin/reset')
      .expect(201);

    expect(resetResponse.body.couple.groom.firstName).toBe('민수');
  });
});
