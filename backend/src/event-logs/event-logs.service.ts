import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import {
  Asset,
  AssetCategory,
  AssetModerationStatus,
} from '../assets/asset.entity';
import { Guestbook } from '../guestbook/guestbook.entity';
import { Rsvp } from '../rsvp/rsvp.entity';
import { EventLog } from './event-log.entity';

type RequestLike = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type CreateEventLogParams = {
  eventType: string;
  section?: string | null;
  action?: string | null;
  label?: string | null;
  path?: string | null;
  url?: string | null;
  referrer?: string | null;
  sessionId?: string | null;
  userId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  metadata?: Record<string, unknown> | null;
};

type EventLogFilters = {
  eventType?: string;
  section?: string;
  action?: string;
  sessionId?: string;
  userName?: string;
  userEmail?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class EventLogsService {
  constructor(
    @InjectRepository(EventLog)
    private readonly eventLogRepository: Repository<EventLog>,
    @InjectRepository(Guestbook)
    private readonly guestbookRepository: Repository<Guestbook>,
    @InjectRepository(Rsvp)
    private readonly rsvpRepository: Repository<Rsvp>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async recordEvent(payload: CreateEventLogParams, request?: RequestLike) {
    const entity = this.eventLogRepository.create({
      eventType: this.normalizeText(payload.eventType, 100) || 'unknown',
      section: this.normalizeText(payload.section, 100),
      action: this.normalizeText(payload.action, 100),
      label: this.normalizeText(payload.label, 255),
      path: this.normalizeText(payload.path, 255),
      url: this.normalizeText(payload.url, 1024),
      referrer: this.normalizeText(payload.referrer, 1024),
      sessionId: this.normalizeText(payload.sessionId, 150),
      userId: payload.userId ?? null,
      userName: this.normalizeText(payload.userName, 255),
      userEmail: this.normalizeText(payload.userEmail, 255),
      userRole: this.normalizeText(payload.userRole, 50),
      metadata: this.normalizeMetadata(payload.metadata),
      ipAddress: this.normalizeText(request?.ip, 64),
      userAgent: this.normalizeText(this.readUserAgent(request), 512),
    });

    return this.eventLogRepository.save(entity);
  }

  async queryAdminEventLogs(filters: EventLogFilters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const query = this.eventLogRepository
      .createQueryBuilder('event')
      .orderBy('event.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    this.applyFilters(query, filters);

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async exportAdminEventLogs(filters: EventLogFilters = {}) {
    const query = this.eventLogRepository
      .createQueryBuilder('event')
      .orderBy('event.createdAt', 'DESC');

    this.applyFilters(query, filters);

    const items = await query.getMany();
    const headers = [
      'createdAt',
      'eventType',
      'section',
      'action',
      'label',
      'path',
      'url',
      'referrer',
      'sessionId',
      'userId',
      'userName',
      'userEmail',
      'userRole',
      'ipAddress',
      'userAgent',
      'metadata',
    ];

    const rows = items.map((item) =>
      [
        item.createdAt?.toISOString() ?? '',
        item.eventType,
        item.section ?? '',
        item.action ?? '',
        item.label ?? '',
        item.path ?? '',
        item.url ?? '',
        item.referrer ?? '',
        item.sessionId ?? '',
        item.userId ?? '',
        item.userName ?? '',
        item.userEmail ?? '',
        item.userRole ?? '',
        item.ipAddress ?? '',
        item.userAgent ?? '',
        item.metadata ? JSON.stringify(item.metadata) : '',
      ]
        .map((value) => this.escapeCsvCell(value))
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  async buildAdminOverview(user: { email: string; role: string }) {
    const [
      guestbookTotal,
      guestbookHidden,
      rsvpTotal,
      invitationAssets,
      invitationMediaAssets,
      sharedPhotoApproved,
      sharedPhotoPending,
    ] = await Promise.all([
      this.guestbookRepository.count(),
      this.guestbookRepository.count({ where: { isHidden: true } }),
      this.rsvpRepository.count(),
      this.assetRepository.count({
        where: {
          category: AssetCategory.INVITATION,
          isVisible: true,
          isSlotMedia: false,
          moderationStatus: AssetModerationStatus.APPROVED,
        },
      }),
      this.assetRepository.count({
        where: {
          category: AssetCategory.INVITATION,
          isSlotMedia: true,
        },
      }),
      this.assetRepository.count({
        where: {
          category: AssetCategory.SHARED_PHOTO,
          moderationStatus: AssetModerationStatus.APPROVED,
          isVisible: true,
        },
      }),
      this.assetRepository.count({
        where: {
          category: AssetCategory.SHARED_PHOTO,
          moderationStatus: AssetModerationStatus.PENDING,
        },
      }),
    ]);

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      last24hEvents,
      last7dEvents,
      topEventTypes,
      topSections,
      recentEvents,
      uniqueSessionsLast7d,
    ] = await Promise.all([
      this.eventLogRepository.count({
        where: {
          createdAt: Between(last24h, now),
        },
      }),
      this.eventLogRepository.count({
        where: {
          createdAt: Between(last7d, now),
        },
      }),
      this.eventLogRepository
        .createQueryBuilder('event')
        .select('event.eventType', 'eventType')
        .addSelect('COUNT(event.id)', 'count')
        .groupBy('event.eventType')
        .orderBy('COUNT(event.id)', 'DESC')
        .limit(5)
        .getRawMany(),
      this.eventLogRepository
        .createQueryBuilder('event')
        .select('event.section', 'section')
        .addSelect('COUNT(event.id)', 'count')
        .where('event.section IS NOT NULL')
        .andWhere('event.eventType = :eventType', { eventType: 'section_view' })
        .groupBy('event.section')
        .orderBy('COUNT(event.id)', 'DESC')
        .limit(5)
        .getRawMany(),
      this.eventLogRepository.find({
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.eventLogRepository
        .createQueryBuilder('event')
        .select('COUNT(DISTINCT event.sessionId)', 'count')
        .where('event.createdAt BETWEEN :from AND :to', {
          from: last7d,
          to: now,
        })
        .andWhere('event.sessionId IS NOT NULL')
        .getRawOne(),
    ]);

    const totalEvents = await this.eventLogRepository.count();

    return {
      message: '관리자 API 준비 완료',
      user,
      sections: [
        'dashboard',
        'guestbook',
        'rsvp',
        'photos',
        'files',
        'logs',
        'events',
      ],
      metrics: {
        content: {
          guestbookTotal,
          guestbookHidden,
          rsvpTotal,
          invitationAssets,
          invitationMediaAssets,
          sharedPhotoApproved,
          sharedPhotoPending,
        },
        events: {
          totalEvents,
          last24hEvents,
          last7dEvents,
          uniqueSessionsLast7d: Number(uniqueSessionsLast7d?.count || 0),
          topEventTypes: topEventTypes.map((row) => ({
            eventType: row.eventType,
            count: Number(row.count),
          })),
          topSections: topSections.map((row) => ({
            section: row.section,
            count: Number(row.count),
          })),
          recentEvents,
        },
      },
    };
  }

  private applyFilters(
    query: SelectQueryBuilder<EventLog>,
    filters: EventLogFilters,
  ) {
    if (filters.eventType) {
      query.andWhere('event.eventType = :eventType', {
        eventType: filters.eventType,
      });
    }

    if (filters.section) {
      query.andWhere('event.section = :section', { section: filters.section });
    }

    if (filters.action) {
      query.andWhere('event.action = :action', { action: filters.action });
    }

    if (filters.sessionId) {
      query.andWhere('event.sessionId = :sessionId', {
        sessionId: filters.sessionId,
      });
    }

    if (filters.userName) {
      query.andWhere('event.userName = :userName', {
        userName: filters.userName,
      });
    }

    if (filters.userEmail) {
      query.andWhere('event.userEmail = :userEmail', {
        userEmail: filters.userEmail,
      });
    }

    if (filters.from) {
      const fromDate = new Date(filters.from);
      if (!Number.isNaN(fromDate.getTime())) {
        query.andWhere('event.createdAt >= :from', { from: fromDate });
      }
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        query.andWhere('event.createdAt <= :to', { to: toDate });
      }
    }

    if (filters.search) {
      const search = `%${filters.search.trim()}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where('event.label LIKE :search', { search })
            .orWhere('event.path LIKE :search', { search })
            .orWhere('event.url LIKE :search', { search })
            .orWhere('event.referrer LIKE :search', { search })
            .orWhere('event.userName LIKE :search', { search })
            .orWhere('event.userEmail LIKE :search', { search })
            .orWhere('event.sessionId LIKE :search', { search })
            .orWhere('event.eventType LIKE :search', { search })
            .orWhere('event.section LIKE :search', { search })
            .orWhere('event.action LIKE :search', { search });
        }),
      );
    }
  }

  private normalizeText(value?: string | null, maxLength = 255) {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    return normalized.slice(0, maxLength);
  }

  private readUserAgent(request?: RequestLike) {
    const userAgent = request?.headers?.['user-agent'];
    if (Array.isArray(userAgent)) {
      return userAgent.join(' ');
    }

    return typeof userAgent === 'string' ? userAgent : null;
  }

  private escapeCsvCell(value: string | number | null | undefined) {
    let normalized = value == null ? '' : String(value);
    if (/^[=+\-@]/.test(normalized) || /^[\t\r]/.test(normalized)) {
      normalized = `'${normalized}`;
    }

    if (/[",\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }

    return normalized;
  }

  private normalizeMetadata(metadata?: Record<string, unknown> | null) {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const normalized = this.sanitizeMetadataValue(metadata, 0);
    if (
      !normalized ||
      Array.isArray(normalized) ||
      typeof normalized !== 'object'
    ) {
      return null;
    }

    const serialized = JSON.stringify(normalized);
    if (serialized.length <= 2000) {
      return normalized as Record<string, unknown>;
    }

    return {
      truncated: true,
      preview: serialized.slice(0, 2000),
    };
  }

  private sanitizeMetadataValue(value: unknown, depth: number): unknown {
    if (depth > 3) {
      return '[truncated]';
    }

    if (typeof value === 'string') {
      return this.normalizeText(value, 300);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .slice(0, 20)
        .map((item) => this.sanitizeMetadataValue(item, depth + 1))
        .filter((item) => item !== null && item !== undefined);
    }

    if (!value || typeof value !== 'object') {
      return null;
    }

    return Object.entries(value)
      .slice(0, 20)
      .reduce<Record<string, unknown>>((result, [key, item]) => {
        const normalizedKey = this.normalizeText(key, 100);
        const normalizedValue = this.sanitizeMetadataValue(item, depth + 1);

        if (
          normalizedKey &&
          normalizedValue !== null &&
          normalizedValue !== undefined
        ) {
          result[normalizedKey] = normalizedValue;
        }

        return result;
      }, {});
  }
}
