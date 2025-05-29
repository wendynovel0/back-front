// src/auth/services/pending-user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PendingUser } from '../entities/pending-user.entity';

@Injectable()
export class PendingUserService {
  constructor(
    @InjectRepository(PendingUser)
    private readonly pendingUserRepository: Repository<PendingUser>,
  ) {}

  async create(pendingUserData: Partial<PendingUser>) {
    const pendingUser = this.pendingUserRepository.create(pendingUserData);
    return this.pendingUserRepository.save(pendingUser);
  }

  async findByToken(token: string) {
    return this.pendingUserRepository.findOne({ 
      where: { confirmationToken: token } 
    });
  }

  async delete(id: number) {
    return this.pendingUserRepository.delete(id);
  }
}