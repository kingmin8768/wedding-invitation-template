import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class GameEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  gameSlug: string;

  @Column()
  displayName: string;

  @Column()
  submittedByUserId: number;

  @Column()
  submittedByEmail: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
