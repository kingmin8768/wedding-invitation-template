import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Asset,
  AssetCategory,
  AssetModerationStatus,
} from '../assets/asset.entity';
import { AssetsService } from '../assets/assets.service';
import {
  InvitationMediaItem,
  InvitationMediaSlot,
} from './invitation-media.entity';

type CreateInvitationMediaParams = {
  slot: InvitationMediaSlot;
  assetId: number;
  targetUrl?: string | null;
  caption?: string | null;
  displayOrder?: number;
  isVisible?: boolean;
};

type UpdateInvitationMediaParams = {
  targetUrl?: string | null;
  caption?: string | null;
  displayOrder?: number;
  isVisible?: boolean;
};

type PublicInvitationMediaItem = {
  id: number;
  slot: InvitationMediaSlot;
  assetId: number;
  displayOrder: number;
  isVisible: boolean;
  targetUrl: string | null;
  caption: string | null;
  asset: ReturnType<AssetsService['toPublicAsset']> | null;
};

@Injectable()
export class InvitationMediaService {
  constructor(
    @InjectRepository(InvitationMediaItem)
    private readonly invitationMediaRepository: Repository<InvitationMediaItem>,
    @InjectRepository(Asset)
    private readonly assetsRepository: Repository<Asset>,
    private readonly assetsService: AssetsService,
  ) {}

  async findPublicMedia() {
    const items = await this.invitationMediaRepository.find({
      where: { isVisible: true },
      order: {
        slot: 'ASC',
        displayOrder: 'ASC',
        updatedAt: 'DESC',
      },
    });

    const payload = {
      hero: null as PublicInvitationMediaItem | null,
      couple: null as PublicInvitationMediaItem | null,
      gallery: [] as PublicInvitationMediaItem[],
      footer: null as PublicInvitationMediaItem | null,
    };

    for (const item of items) {
      const publicItem = this.toPublicItem(item);

      if (item.slot === InvitationMediaSlot.GALLERY) {
        payload.gallery.push(publicItem);
        continue;
      }

      if (item.slot === InvitationMediaSlot.HERO && !payload.hero) {
        payload.hero = publicItem;
      }

      if (item.slot === InvitationMediaSlot.COUPLE && !payload.couple) {
        payload.couple = publicItem;
      }

      if (item.slot === InvitationMediaSlot.FOOTER && !payload.footer) {
        payload.footer = publicItem;
      }
    }

    return payload;
  }

  findAdminMedia(slot?: InvitationMediaSlot) {
    return this.invitationMediaRepository.find({
      where: slot ? { slot } : {},
      order: {
        slot: 'ASC',
        displayOrder: 'ASC',
        updatedAt: 'DESC',
      },
    });
  }

  async createAssignment(params: CreateInvitationMediaParams) {
    const asset = await this.validateInvitationImageAsset(params.assetId);
    const displayOrder =
      params.slot === InvitationMediaSlot.GALLERY
        ? await this.resolveDisplayOrder(params.slot, params.displayOrder)
        : 0;

    const nextItem = this.invitationMediaRepository.create({
      slot: params.slot,
      assetId: asset.id,
      displayOrder,
      isVisible: params.isVisible ?? true,
      targetUrl: this.normalizeOptionalUrl(params.targetUrl),
      caption: this.normalizeOptionalText(params.caption),
    });

    const savedItem = await this.invitationMediaRepository.save(nextItem);

    if (this.isSingleSlot(params.slot) && savedItem.isVisible) {
      await this.hideSiblingSingleSlotItems(params.slot, savedItem.id);
    }

    return this.findOne(savedItem.id);
  }

  async updateItem(id: number, params: UpdateInvitationMediaParams) {
    const existingItem = await this.findOne(id);

    if (!existingItem) {
      return null;
    }

    if (Number.isFinite(params.displayOrder)) {
      existingItem.displayOrder = params.displayOrder;
    }

    if (typeof params.isVisible === 'boolean') {
      existingItem.isVisible = params.isVisible;
    }

    if (Object.prototype.hasOwnProperty.call(params, 'targetUrl')) {
      existingItem.targetUrl = this.normalizeOptionalUrl(params.targetUrl);
    }

    if (Object.prototype.hasOwnProperty.call(params, 'caption')) {
      existingItem.caption = this.normalizeOptionalText(params.caption);
    }

    const savedItem = await this.invitationMediaRepository.save(existingItem);

    if (this.isSingleSlot(savedItem.slot) && savedItem.isVisible) {
      await this.hideSiblingSingleSlotItems(savedItem.slot, savedItem.id);
      return this.findOne(savedItem.id);
    }

    return savedItem;
  }

  async updateOrder(id: number, displayOrder: number) {
    return this.updateItem(id, { displayOrder });
  }

  async removeItem(id: number) {
    const existingItem = await this.findOne(id);

    if (!existingItem) {
      return null;
    }

    await this.invitationMediaRepository.delete(id);

    const remainingReferences = await this.invitationMediaRepository.count({
      where: { assetId: existingItem.assetId },
    });

    if (
      existingItem.asset?.managedByInvitationMedia &&
      remainingReferences === 0
    ) {
      await this.assetsService.removeStoredAsset(existingItem.asset);
    }

    return existingItem;
  }

  findOne(id: number) {
    return this.invitationMediaRepository.findOne({ where: { id } });
  }

  async createAssetAndAssignment(params: {
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    };
    slot: InvitationMediaSlot;
    title?: string | null;
    targetUrl?: string | null;
    caption?: string | null;
    displayOrder?: number;
    isVisible?: boolean;
  }) {
    const asset = await this.assetsService.createUploadedAsset({
      category: AssetCategory.INVITATION,
      file: params.file,
      title: params.title || params.caption || null,
      moderationStatus: AssetModerationStatus.APPROVED,
      isVisible: false,
      isSlotMedia: true,
      managedByInvitationMedia: true,
    });

    return this.createAssignment({
      slot: params.slot,
      assetId: asset.id,
      targetUrl: params.targetUrl,
      caption: params.caption,
      displayOrder: params.displayOrder,
      isVisible: params.isVisible,
    });
  }

  private async validateInvitationImageAsset(assetId: number) {
    const asset = await this.assetsRepository.findOne({
      where: { id: assetId },
    });

    if (!asset) {
      throw new BadRequestException('선택한 이미지를 찾을 수 없습니다.');
    }

    if (asset.category !== AssetCategory.INVITATION) {
      throw new BadRequestException('청첩장 자료만 연결할 수 있습니다.');
    }

    if (!asset.mimeType.startsWith('image/')) {
      throw new BadRequestException(
        '이미지 파일만 청첩장 대표 이미지로 연결할 수 있습니다.',
      );
    }

    return asset;
  }

  private async resolveDisplayOrder(
    slot: InvitationMediaSlot,
    displayOrder?: number,
  ) {
    if (Number.isFinite(displayOrder)) {
      return displayOrder;
    }

    const count = await this.invitationMediaRepository.count({
      where: { slot },
    });
    return count;
  }

  private async hideSiblingSingleSlotItems(
    slot: InvitationMediaSlot,
    currentId: number,
  ) {
    await this.invitationMediaRepository
      .createQueryBuilder()
      .update(InvitationMediaItem)
      .set({ isVisible: false })
      .where('slot = :slot', { slot })
      .andWhere('id != :currentId', { currentId })
      .execute();
  }

  private isSingleSlot(slot: InvitationMediaSlot) {
    return (
      slot === InvitationMediaSlot.HERO ||
      slot === InvitationMediaSlot.COUPLE ||
      slot === InvitationMediaSlot.FOOTER
    );
  }

  private normalizeOptionalText(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeOptionalUrl(value?: string | null) {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return null;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalized);
    } catch {
      throw new BadRequestException(
        '링크 주소는 http:// 또는 https:// 형식이어야 합니다.',
      );
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException(
        '링크 주소는 http:// 또는 https:// 형식이어야 합니다.',
      );
    }

    return parsedUrl.toString();
  }

  private toPublicItem(item: InvitationMediaItem): PublicInvitationMediaItem {
    return {
      id: item.id,
      slot: item.slot,
      assetId: item.assetId,
      displayOrder: item.displayOrder,
      isVisible: item.isVisible,
      targetUrl: item.targetUrl,
      caption: item.caption,
      asset: item.asset ? this.assetsService.toPublicAsset(item.asset) : null,
    };
  }
}
