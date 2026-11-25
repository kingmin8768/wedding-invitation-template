import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AssetCategory {
  INVITATION = 'invitation',
  SHARED_PHOTO = 'shared-photo',
}

export enum AssetModerationStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
}

@Entity()
export class Asset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    default: AssetCategory.INVITATION,
  })
  category: AssetCategory;

  @Column({
    type: 'varchar',
    default: AssetModerationStatus.APPROVED,
  })
  moderationStatus: AssetModerationStatus;

  @Column({ default: true })
  isVisible: boolean;

  @Column({ default: false })
  isSlotMedia: boolean;

  @Column({ default: false })
  managedByInvitationMedia: boolean;

  @Column({ nullable: true })
  title: string | null;

  @Column()
  originalName: string;

  @Column()
  storedName: string;

  @Column()
  publicUrl: string;

  @Column()
  mimeType: string;

  @Column('integer')
  size: number;

  @Column({ nullable: true })
  uploadedByUserId: number | null;

  @Column({ nullable: true })
  uploaderEmail: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
