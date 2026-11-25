import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  create(data: Partial<User>) {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
  }

  findById(id: number) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async updateRefreshTokenHash(
    userId: number,
    refreshTokenHash: string | null,
  ) {
    await this.usersRepository.update(userId, { refreshTokenHash });
  }

  async ensureAdminUser(email: string, passwordHash: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);

    if (existing) {
      if (existing.role !== UserRole.ADMIN) {
        existing.role = UserRole.ADMIN;
        existing.passwordHash = passwordHash;
        await this.usersRepository.save(existing);
      }
      return existing;
    }

    return this.create({
      displayName: '관리자',
      email: normalizedEmail,
      passwordHash,
      role: UserRole.ADMIN,
    });
  }
}
