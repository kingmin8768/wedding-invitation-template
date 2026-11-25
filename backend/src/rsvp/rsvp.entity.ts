import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Rsvp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'groom' })
  side: string;

  @Column()
  name: string;

  @Column({ default: 'yes' })
  attendance: string;

  @Column({ default: 'undecided' })
  afterPartyAttendance: string;

  @Column({ default: 1 })
  guests: number;

  @Column({ default: 'yes' })
  meal: string;

  @CreateDateColumn()
  createdAt: Date;
}
