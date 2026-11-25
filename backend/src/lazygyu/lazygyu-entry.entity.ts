import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LazygyuEntryStatus = 'active' | 'removed' | 'used';

@Entity()
export class LazygyuEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'main' })
  roomSlug: string;

  @Column()
  displayName: string;

  @Column({ nullable: true })
  submittedByUserId: number | null;

  @Column({ nullable: true })
  submittedByEmail: string | null;

  @Column({ nullable: true })
  submittedByClientKey: string | null;

  @Column({ type: 'varchar', default: 'active' })
  status: LazygyuEntryStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
