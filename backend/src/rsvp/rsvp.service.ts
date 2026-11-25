import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rsvp } from './rsvp.entity';

@Injectable()
export class RsvpService {
  constructor(
    @InjectRepository(Rsvp)
    private readonly rsvpRepo: Repository<Rsvp>,
  ) {}

  async findAll(): Promise<Rsvp[]> {
    return this.rsvpRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(data: Partial<Rsvp>): Promise<Rsvp> {
    const entry = this.rsvpRepo.create(data);
    return this.rsvpRepo.save(entry);
  }
}
