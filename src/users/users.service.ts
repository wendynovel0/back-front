import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { applyDateRangeFilter } from '../common/utils/query.utils';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ReplaceUserDto } from './dto/replace-user.dto';
import { User } from './entities/user.entity';
import { UsersView } from './entities/users-view.entity';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { AuthService } from '../auth/auth.service'; // 👈 importa el AuthService

interface Filters {
  email?: string;
  dateFilter?: {
    dateType: 'created_at' | 'updated_at' | 'deleted_at';
    startDate: string;
    endDate: string;
  };
  is_active?: boolean | 'pending';
  status?: 'pending',
}
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UsersView)
    private usersViewRepository: Repository<UsersView>,
    private actionLogsService: ActionLogsService,

    @Inject(forwardRef(() => AuthService)) 
    private authService: AuthService,
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
  const hashedPassword = await bcrypt.hash(createUserDto.password_hash, 10); // 10 es el salt rounds
  createUserDto.password_hash = hashedPassword;

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

  async findOneInactive(user_id: number): Promise<User | null> {
  return this.userRepository.findOne({
    where: { user_id, is_active: false },
  });
}


  async findOne(id: number): Promise<Partial<UsersView>> {
  const user = await this.usersViewRepository.findOne({ where: { user_id: id } });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return {
    user_id: user.user_id,
    email: user.email,
    is_active: user.is_active,
  };
}

 async replace(
  id: number,
  replaceUserDto: ReplaceUserDto,
  performedBy: number,
  ip?: string,
): Promise<User> {
  const user = await this.findOneActive(id);
  const oldValue = { ...user };

  if (!replaceUserDto.email || replaceUserDto.email.trim() === '') {
    throw new BadRequestException('El email es obligatorio');
  }

  // Creamos el objeto updatedData sin la contraseña aún
  const { password_hash, ...rest } = replaceUserDto;
  const updatedData: Partial<User> = { ...rest };

  // Solo si password_hash viene y no está vacío, hacemos hash y actualizamos
  if (password_hash && password_hash.trim() !== '') {
    const saltRounds = 10;
    updatedData.password_hash = await bcrypt.hash(password_hash, saltRounds);
  } else {
    // Si no viene la contraseña, la mantenemos igual (no hacer nada)
    // Así no se toca la contraseña actual
  }

  if ('deleted_at' in updatedData) {
    if (updatedData.deleted_at === null) {
      updatedData.deleted_at = undefined;
    }
  }

  const newUser = this.userRepository.create({
    ...user,
    ...updatedData,
  });

  const replacedUser = await this.userRepository.save(newUser);

  await this.actionLogsService.logAction({
    userId: performedBy,
    actionType: 'UPDATE',
    entityType: 'User',
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
  const user = await this.findOneInactive(id); // busca solo si está inactivo
  if (!user) {
    throw new NotFoundException('El usuario no existe o ya está activo');
  }

  const oldValue = { ...user };

  // Activar usuario y poner fecha de activación
  user.is_active = true;
  user.activated_at = new Date();

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
  const user = await this.userRepository.findOne({ where: { user_id: id } });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  const oldValue = { ...user };

  // Soft delete: desactivar y poner fecha
  user.is_active = false;
  user.deleted_at = new Date();

  const updatedUser = await this.userRepository.save(user);

  await this.actionLogsService.logAction({
    userId: performedBy,
    actionType: 'DELETE',
    entityType: 'user',
    entityId: updatedUser.user_id,
    oldValue,
    newValue: updatedUser,
    ipAddress: ip,
  });

}

async findOneActive(user_id: number): Promise<User | null> {
  return this.userRepository.findOne({
    where: { user_id, is_active: true },
  });
}


  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
  try {
    return await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash') 
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

  async findAllWithFilters(filters: Filters): Promise<UsersView[]> {
  const query = this.usersViewRepository.createQueryBuilder('user');

  if (filters.email) {
    query.andWhere('LOWER(user.email) LIKE LOWER(:email)', { email: `%${filters.email}%` });
  }

  if (filters.status === 'pending' || filters.is_active === 'pending') {
      query.andWhere('user.is_active = false');
      query.andWhere('user.activation_token IS NOT NULL');
    } else if (typeof filters.is_active === 'boolean') {
      query.andWhere('user.is_active = :isActive', { isActive: filters.is_active });
    }



  if (filters.dateFilter) {
  const { dateType, startDate, endDate } = filters.dateFilter;

  if (!startDate || !endDate) {
    throw new Error('Debe especificar ambas fechas para el filtro de fechas.');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  if (start > end) {
    throw new Error('La fecha de inicio no puede ser mayor que la fecha final.');
  }

  if (end > today) {
    throw new Error('La fecha final no puede ser una fecha futura.');
  }

  applyDateRangeFilter(query, 'user', { dateType, startDate, endDate });
}

  return query.orderBy(`"user"."created_at"`, 'DESC').getMany();
}

async findByActivationToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { activation_token: token } });
  }

  async activateUser(token: string): Promise<User> {
    const user = await this.findByActivationToken(token);
    console.log('Usuario con token:', user);

    if (!user) {
      throw new NotFoundException('Token inválido');
    }
    user.is_active = true;
    user.activation_token = null;
    return this.userRepository.save(user); 
  }

async activateUserByToken(token: string): Promise<User> {
  const user = await this.userRepository.findOne({ 
    where: { 
      activation_token: token,
      is_active: false 
    }
  });

  if (!user) {
    throw new NotFoundException('Token inválido o cuenta ya activada');
  }

  user.is_active = true;
  user.activation_token = null;
  user.activated_at = new Date();

  return this.userRepository.save(user);
}

  async confirmUser(activationToken: string): Promise<any> {
    const user = await this.findByActivationToken(activationToken);
    if (!user) {
      throw new NotFoundException('Token de activación inválido o expirado');
    }

    const updateUserDto: UpdateUserDto = {
      is_active: true,
      activation_token: null,
      activated_at: new Date(),
    };

    await this.update(user.user_id, updateUserDto, user.user_id);
    return {
      success: true,
      message: 'Usuario activado correctamente',
    };
  }
}
