import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { Repository } from 'typeorm';
import { Asset, AssetCategory, AssetModerationStatus } from './asset.entity';

type UploadedFilePayload = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
  detectedExtension?: string;
  detectedMimeType?: string;
};

type CreateAssetParams = {
  category: AssetCategory;
  file: UploadedFilePayload;
  title?: string;
  moderationStatus?: AssetModerationStatus;
  isVisible?: boolean;
  isSlotMedia?: boolean;
  managedByInvitationMedia?: boolean;
  uploadedByUserId?: number | null;
  uploaderEmail?: string | null;
};

type PublicAssetPayload = {
  id: number;
  title: string | null;
  originalName: string;
  publicUrl: string;
  mimeType: string;
};

type SafeFileType = {
  extension: string;
  mimeType: string;
};

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepository: Repository<Asset>,
  ) {}

  findPublicInvitationAssets() {
    return this.assetsRepository
      .find({
        where: {
          category: AssetCategory.INVITATION,
          moderationStatus: AssetModerationStatus.APPROVED,
          isVisible: true,
          isSlotMedia: false,
        },
        order: { createdAt: 'DESC' },
      })
      .then((assets) => assets.map((asset) => this.toPublicAsset(asset)));
  }

  findPublicSharedPhotos() {
    return this.assetsRepository
      .find({
        where: {
          category: AssetCategory.SHARED_PHOTO,
          moderationStatus: AssetModerationStatus.APPROVED,
          isVisible: true,
        },
        order: { createdAt: 'DESC' },
      })
      .then((assets) => assets.map((asset) => this.toPublicAsset(asset)));
  }

  findAdminAssets(category?: AssetCategory) {
    if (category === AssetCategory.INVITATION) {
      return this.assetsRepository.find({
        where: {
          category,
          isSlotMedia: false,
        },
        order: { createdAt: 'DESC' },
      });
    }

    return this.assetsRepository.find({
      where: category ? { category } : {},
      order: { createdAt: 'DESC' },
    });
  }

  findMemberAssets(userId: number, category: AssetCategory) {
    return this.assetsRepository.find({
      where: {
        uploadedByUserId: userId,
        category,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async createUploadedAsset({
    category,
    file,
    title,
    moderationStatus = AssetModerationStatus.APPROVED,
    isVisible = true,
    isSlotMedia = false,
    managedByInvitationMedia = false,
    uploadedByUserId = null,
    uploaderEmail = null,
  }: CreateAssetParams) {
    const normalizedFile = this.validateUpload(file, {
      allowPdf: category === AssetCategory.INVITATION && !isSlotMedia,
    });
    const targetDir = join(this.getUploadRoot(), category);
    const extension =
      normalizedFile.detectedExtension ||
      extname(normalizedFile.originalname) ||
      this.extensionFromMime(normalizedFile.mimetype);
    const storedName = `${Date.now()}-${randomUUID()}${extension}`;

    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, storedName), normalizedFile.buffer);

    const asset = this.assetsRepository.create({
      category,
      moderationStatus,
      isVisible,
      isSlotMedia,
      managedByInvitationMedia,
      title: title?.trim() || null,
      originalName: normalizedFile.originalname,
      storedName,
      publicUrl: `/uploads/${category}/${storedName}`,
      mimeType: normalizedFile.detectedMimeType || normalizedFile.mimetype,
      size: normalizedFile.size,
      uploadedByUserId,
      uploaderEmail,
    });

    return this.assetsRepository.save(asset);
  }

  async removeStoredAsset(asset: Asset) {
    try {
      await unlink(
        join(this.getUploadRoot(), asset.category, asset.storedName),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    await this.assetsRepository.delete(asset.id);
  }

  async updateVisibility(id: number, isVisible: boolean) {
    await this.assetsRepository.update(id, { isVisible });
    return this.assetsRepository.findOne({ where: { id } });
  }

  async approve(id: number) {
    await this.assetsRepository.update(id, {
      moderationStatus: AssetModerationStatus.APPROVED,
      isVisible: true,
    });
    return this.assetsRepository.findOne({ where: { id } });
  }

  getUploadRoot() {
    return resolve(process.env.UPLOAD_ROOT || 'uploads');
  }

  toPublicAsset(asset: Asset): PublicAssetPayload {
    return {
      id: asset.id,
      title: asset.title,
      originalName: asset.originalName,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
    };
  }

  validateUpload(
    file: UploadedFilePayload,
    options: { allowPdf?: boolean } = {},
  ): UploadedFilePayload {
    if (!file?.buffer?.length || file.size <= 0) {
      throw new BadRequestException('비어 있는 파일은 업로드할 수 없습니다.');
    }

    if (this.isDangerousExtension(file.originalname)) {
      throw new BadRequestException('허용되지 않는 파일 확장자입니다.');
    }

    const detected = this.detectFileType(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        options.allowPdf
          ? 'JPEG, PNG, GIF, WEBP 이미지 또는 PDF 파일만 업로드할 수 있습니다.'
          : 'JPEG, PNG, GIF, WEBP 이미지 파일만 업로드할 수 있습니다.',
      );
    }

    if (detected.mimeType === 'application/pdf' && !options.allowPdf) {
      throw new BadRequestException('이미지 파일만 업로드할 수 있습니다.');
    }

    return {
      ...file,
      mimetype: detected.mimeType,
      detectedMimeType: detected.mimeType,
      detectedExtension: detected.extension,
    };
  }

  private extensionFromMime(mimeType: string) {
    if (mimeType === 'application/pdf') {
      return '.pdf';
    }

    if (mimeType === 'image/png') {
      return '.png';
    }

    if (mimeType === 'image/webp') {
      return '.webp';
    }

    return '.jpg';
  }

  private detectFileType(buffer: Buffer): SafeFileType | null {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { mimeType: 'image/jpeg', extension: '.jpg' };
    }

    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { mimeType: 'image/png', extension: '.png' };
    }

    if (
      buffer.length >= 6 &&
      buffer.subarray(0, 6).toString('ascii') === 'GIF87a'
    ) {
      return { mimeType: 'image/gif', extension: '.gif' };
    }

    if (
      buffer.length >= 6 &&
      buffer.subarray(0, 6).toString('ascii') === 'GIF89a'
    ) {
      return { mimeType: 'image/gif', extension: '.gif' };
    }

    if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { mimeType: 'image/webp', extension: '.webp' };
    }

    if (
      buffer.length >= 5 &&
      buffer.subarray(0, 5).toString('ascii') === '%PDF-'
    ) {
      return { mimeType: 'application/pdf', extension: '.pdf' };
    }

    return null;
  }

  private isDangerousExtension(originalName: string) {
    const extension = extname(originalName).toLowerCase();

    return [
      '.html',
      '.htm',
      '.shtml',
      '.xhtml',
      '.xml',
      '.svg',
      '.svgz',
      '.js',
      '.mjs',
      '.cjs',
    ].includes(extension);
  }
}
