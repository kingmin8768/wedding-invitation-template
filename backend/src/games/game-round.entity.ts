import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GameWinnerMode } from './game-event-state.entity';

export enum GameRoundStatus {
  RUNNING = 'running',
  FINISHED = 'finished',
}

@Entity()
export class GameRound {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  gameSlug: string;

  @Column({
    type: 'varchar',
    default: GameRoundStatus.RUNNING,
  })
  status: GameRoundStatus;

  @Column('simple-json')
  snapshotEntries: string[];

  @Column()
  seed: string;

  @Column()
  winnerName: string;

  @Column({
    type: 'varchar',
    default: GameWinnerMode.FIRST,
    nullable: true,
  })
  winnerMode: GameWinnerMode | null;

  @Column('integer', { nullable: true })
  winnerRank: number | null;

  @Column('integer')
  entryCount: number;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  revealAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
