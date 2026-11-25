import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Asset } from '../assets/asset.entity';

export enum InvitationMediaSlot {
  HERO = 'hero',
  COUPLE = 'couple',
  GALLERY = 'gallery',
  FOOTER = 'footer',
}

@Entity()
export class InvitationMediaItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
  })
  slot: InvitationMediaSlot;

  @Column()
  assetId: number;

  @ManyToOne(() => Asset, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset: Asset;

  @Column({ default: 0 })
  displayOrder: number;

  @Column({ default: true })
  isVisible: boolean;

  @Column({ nullable: true })
  targetUrl: string | null;

  @Column({ nullable: true })
  caption: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
