import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
@Index(['eventType', 'createdAt'])
@Index(['section', 'createdAt'])
@Index(['sessionId', 'createdAt'])
@Index(['userName', 'createdAt'])
@Index(['userEmail', 'createdAt'])
export class EventLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  eventType: string;

  @Column({ nullable: true })
  section: string | null;

  @Column({ nullable: true })
  action: string | null;

  @Column({ nullable: true })
  label: string | null;

  @Column({ nullable: true })
  path: string | null;

  @Column({ nullable: true })
  url: string | null;

  @Column({ nullable: true })
  referrer: string | null;

  @Column({ nullable: true })
  sessionId: string | null;

  @Column({ nullable: true })
  userId: number | null;

  @Column({ nullable: true })
  userName: string | null;

  @Column({ nullable: true })
  userEmail: string | null;

  @Column({ nullable: true })
  userRole: string | null;

  @Column({ nullable: true })
  ipAddress: string | null;

  @Column({ nullable: true })
  userAgent: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
