import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Guestbook } from './guestbook.entity';

type PublicGuestbookEntry = {
  id: number;
  name: string;
  message: string;
  createdAt: Date;
};

@Injectable()
export class GuestbookService {
  constructor(
    @InjectRepository(Guestbook)
    private readonly guestbookRepo: Repository<Guestbook>,
  ) {}

  async findPublic(): Promise<PublicGuestbookEntry[]> {
    const entries = await this.guestbookRepo.find({
      where: { isHidden: false },
      order: { createdAt: 'DESC' },
    });

    return entries.map((entry) => this.toPublicEntry(entry));
  }

  async findAdminAll(): Promise<Guestbook[]> {
    return this.guestbookRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(data: Partial<Guestbook>): Promise<Guestbook> {
    const password = data.password?.trim();
    const passwordHash = await bcrypt.hash(password || '', 10);
    const entry = this.guestbookRepo.create({
      ...data,
      password: passwordHash,
    });
    return this.guestbookRepo.save(entry);
  }

  async delete(id: number, password: string): Promise<boolean> {
    const entry = await this.guestbookRepo.findOne({ where: { id } });
    if (!entry) {
      return false;
    }

    const isLegacyPlaintext = !this.isHashedPassword(entry.password);
    const matches = isLegacyPlaintext
      ? entry.password === password
      : await bcrypt.compare(password, entry.password);

    if (!matches) {
      return false;
    }

    await this.guestbookRepo.delete(id);
    return true;
  }

  async updateVisibility(id: number, isHidden: boolean) {
    await this.guestbookRepo.update(id, { isHidden });
    return this.guestbookRepo.findOne({ where: { id } });
  }

  private toPublicEntry(entry: Guestbook): PublicGuestbookEntry {
    return {
      id: entry.id,
      name: entry.name,
      message: entry.message,
      createdAt: entry.createdAt,
    };
  }

  private isHashedPassword(value: string) {
    return (
      value.startsWith('$2a$') ||
      value.startsWith('$2b$') ||
      value.startsWith('$2y$')
    );
  }
}
