import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LazygyuRoomStatus = 'closed' | 'open' | 'running' | 'finished';
export type LazygyuWinnerMode = 'first' | 'last' | 'nth';

@Entity()
export class LazygyuRoom {
  @PrimaryColumn({ default: 'main' })
  slug: string;

  @Column({ type: 'varchar', default: 'closed' })
  status: LazygyuRoomStatus;

  @Column({ default: false })
  submissionsOpen: boolean;

  @Column({ default: true })
  skillsEnabled: boolean;

  @Column({ type: 'varchar', default: 'first' })
  winnerMode: LazygyuWinnerMode;

  @Column({ type: 'integer', default: 1 })
  nthWinner: number;

  @Column({ type: 'integer', default: 1 })
  activeWinnerRank: number;

  @Column({ default: false })
  streamActive: boolean;

  @Column({ nullable: true })
  officialWinnerName: string | null;

  @Column({ type: 'simple-json', nullable: true })
  roundSnapshot: Array<{ id: number; displayName: string }> | null;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'integer', default: 0 })
  lastFrameSequence: number;

  @Column({ type: 'datetime', nullable: true })
  lastFrameAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
