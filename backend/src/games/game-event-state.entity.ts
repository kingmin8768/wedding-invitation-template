import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum GameSubmissionStatus {
  CLOSED = 'closed',
  OPEN = 'open',
  LOCKED = 'locked',
  RUNNING = 'running',
  FINISHED = 'finished',
}

export enum GameWinnerMode {
  FIRST = 'first',
  LAST = 'last',
  CUSTOM = 'custom',
}

@Entity()
@Unique(['gameSlug'])
export class GameEventState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  gameSlug: string;

  @Column({
    type: 'varchar',
    default: GameSubmissionStatus.CLOSED,
  })
  submissionStatus: GameSubmissionStatus;

  @Column({ nullable: true })
  currentRoundId: number | null;

  @Column({
    type: 'varchar',
    default: GameWinnerMode.FIRST,
    nullable: true,
  })
  winnerMode: GameWinnerMode | null;

  @Column({
    default: 1,
    nullable: true,
  })
  customWinnerRank: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
