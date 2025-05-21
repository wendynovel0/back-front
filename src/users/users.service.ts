import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ReplaceUserDto } from './dto/replace-user.dto';
import { User } from './entities/user.entity';
import { UsersView } from './entities/users-view.entity';
import { ActionLogsService } from '../action-logs/action-logs.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UsersView)
    private readonly usersViewRepository: Repository<UsersView>,
    private actionLogsService: ActionLogsService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

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

  async findAllWithFilters(filters: {
    search?: string;
    createdStartDate?: string;
    createdEndDate?: string;
    updatedStartDate?: string;
    updatedEndDate?: string;
    isActive?: boolean;
  }): Promise<User[]> {
    const query = this.userRepository.createQueryBuilder('user');

    if (filters.search) {
      const lowerSearch = `%${filters.search.toLowerCase()}%`;
      query.andWhere(
        '(LOWER(user.email) LIKE :search OR LOWER(user.first_name) LIKE :search OR LOWER(user.last_name) LIKE :search)',
        { search: lowerSearch },
      );
    }

    if (filters.createdStartDate && filters.createdEndDate) {
      query.andWhere('user.created_at BETWEEN :start AND :end', {
        start: filters.createdStartDate,
        end: filters.createdEndDate,
      });
    }

    if (filters.updatedStartDate && filters.updatedEndDate) {
      query.andWhere('user.updated_at BETWEEN :startU AND :endU', {
        startU: filters.updatedStartDate,
        endU: filters.updatedEndDate,
      });
    }

    if (filters.isActive !== undefined) {
      query.andWhere('user.is_active = :isActive', {
        isActive: filters.isActive,
      });
    }

    return query.getMany();
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

  async replace(
    id: number,
    replaceUserDto: ReplaceUserDto,
    performedBy: number,
    ip?: string,
  ): Promise<User> {
    const user = await this.findOne(id);
    const oldValue = { ...user };

    if (!replaceUserDto.email || replaceUserDto.email.trim() === '') {
      throw new BadRequestException('El email es obligatorio');
    }

    const updatedData = { ...replaceUserDto };

    if (replaceUserDto.password_hash) {
      const saltRounds = 10;
      updatedData.password_hash = await bcrypt.hash(replaceUserDto.password_hash, saltRounds);
    }

    const newUser = this.userRepository.create({
      ...user,
      ...updatedData,
    });

    const replacedUser = await this.userRepository.save(newUser);

    await this.actionLogsService.logAction({
      userId: performedBy,
      actionType: 'REPLACE',
      entityType: 'user',
      entityId: replacedUser.user_id,
      oldValue,
      newValue: replacedUser,
      ipAddress: ip,
    });

    return replacedUser;
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

  async remove(id: number, performedBy: number, ip?: string): Promise<void> {
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
