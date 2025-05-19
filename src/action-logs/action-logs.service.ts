import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { ActionLog } from './entities/action-log.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ActionLogsService {
  constructor(
    @InjectRepository(ActionLog)
    private actionLogRepository: Repository<ActionLog>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async logAction(logData: {
  userId: number;
  actionType: string;
  entityType: string;
  entityId?: number;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}): Promise<ActionLog> {
  // Busca el usuario por ID
  const user = await this.userRepository.findOne({
    where: { user_id: logData.userId }
  });

  if (!user) {
    throw new NotFoundException(`User with ID ${logData.userId} not found`);
  }

  // Crea el log asignando el objeto user completo
  const log = this.actionLogRepository.create({
    user, // <--- asignas la entidad User aquí
    userId: user.user_id, // Opcional, según tu entidad
    actionType: logData.actionType,
    tableAffected: logData.entityType,
    recordId: logData.entityId,
    oldValues: logData.oldValue,
    newValues: logData.newValue,
  });

  return this.actionLogRepository.save(log);
}


  async findAll({
  page = 1,
  limit = 20,
  actionType,
  tableAffected,
  startDate,
  endDate,
  userId,
}: {
  page?: number;
  limit?: number;
  actionType?: string;
  tableAffected?: string;
  startDate?: Date;
  endDate?: Date;
  userId?: number;
}): Promise<{ data: any[]; count: number }> {
  const where: any = {};
  const skip = (page - 1) * limit;

  if (actionType) {
    where.actionType = actionType;
  }

  if (tableAffected) {
    where.tableAffected = tableAffected;
  }

  if (userId) {
    where.userId = userId;
  }

  if (startDate && endDate) {
    where.actionTimestamp = Between(startDate, endDate);
  } else if (startDate) {
    where.actionTimestamp = Between(startDate, new Date());
  }

  const [data, count] = await this.actionLogRepository.findAndCount({
    where,
    order: { actionTimestamp: 'DESC' },
    relations: ['user'],
    skip,
    take: limit,
  });

  // Mapear datos a formato snake_case y parsear JSON
  // Mapear datos a formato snake_case y parsear JSON solo si es string
const mapped = data.map(log => ({
  log_id: log.id,
  user_id: log.userId,
  action_type: log.actionType,
  table_affected: log.tableAffected,
  record_id: log.recordId,
  old_values: typeof log.oldValues === 'string' ? JSON.parse(log.oldValues) : log.oldValues,
  new_values: typeof log.newValues === 'string' ? JSON.parse(log.newValues) : log.newValues,
  action_timestamp: log.actionTimestamp,
}));


  return { data: mapped, count };
}


  async findOne(id: number): Promise<ActionLog> {
    const log = await this.actionLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!log) {
      throw new NotFoundException(`Action log with ID ${id} not found`);
    }

    return log;
  }

  async searchLogs(searchTerm: string): Promise<ActionLog[]> {
    return this.actionLogRepository.find({
      where: [
        { actionType: Like(`%${searchTerm}%`) },
        { tableAffected: Like(`%${searchTerm}%`) },
      ],
      relations: ['user'],
      order: { actionTimestamp: 'DESC' },
      take: 100,
    });
  }
}