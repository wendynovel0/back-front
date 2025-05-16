import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { ActionLogsService } from '../action-logs/action-logs.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private actionLogsService: ActionLogsService,
  ) {}

  //  Sin logs (registro de usuario)
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  //  Con logs (creación por parte de admin u otro)
  async createWithAudit(
    createUserDto: CreateUserDto,
    performedBy: number,
    ip?: string,
  ): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);

    await this.actionLogsService.logAction({
      userId: performedBy,
      actionType: 'CREATE',
      entityType: 'user',
      entityId: savedUser.user_id,
      newValue: savedUser,
      ipAddress: ip,
    });

    return savedUser;
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOneActive(user_id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { user_id, is_active: true },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    performedBy: number,
    ip?: string,
  ): Promise<User> {
    const user = await this.findOne(id);
    const oldValue = { ...user };

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    await this.actionLogsService.logAction({
      userId: performedBy,
      actionType: 'UPDATE',
      entityType: 'user',
      entityId: updatedUser.user_id,
      oldValue,
      newValue: updatedUser,
      ipAddress: ip,
    });

    return updatedUser;
  }

  async remove(
    id: number,
    performedBy: number,
    ip?: string,
  ): Promise<void> {
    const user = await this.findOne(id);

    await this.actionLogsService.logAction({
      userId: performedBy,
      actionType: 'DELETE',
      entityType: 'user',
      entityId: user.user_id,
      oldValue: user,
      ipAddress: ip,
    });

    await this.userRepository.remove(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(user.email) = LOWER(:email)', { email })
        .addSelect('user.password_hash')
        .getOne();
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }
}
