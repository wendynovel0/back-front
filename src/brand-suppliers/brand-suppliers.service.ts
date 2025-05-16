import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandSupplier } from './entities/brand-supplier.entity';
import { CreateBrandSupplierDto } from './dto/create-brand-supplier.dto';
import { UpdateBrandSupplierDto } from './dto/update-brand-supplier.dto';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BrandSuppliersService {
  constructor(
    @InjectRepository(BrandSupplier)
    private readonly brandSupplierRepository: Repository<BrandSupplier>,
    private readonly actionLogsService: ActionLogsService,
  ) {}

  async findAll(filters?: { brandId?: number; isActive?: boolean }): Promise<BrandSupplier[]> {
    const where: any = {};
    
    if (filters?.brandId) {
      where.brand = { brandId: filters.brandId };
    }
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.brandSupplierRepository.find({
      where,
      relations: ['brand'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<BrandSupplier> {
  const supplier = await this.brandSupplierRepository.findOne({
    where: { id }, // Changed from supplierId to id
    relations: ['brand'],
  });

  if (!supplier) {
    throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
  }

  return supplier;
}


  async create(createBrandSupplierDto: CreateBrandSupplierDto, user: User): Promise<BrandSupplier> {
    try {
      const supplier = this.brandSupplierRepository.create(createBrandSupplierDto);
      const savedSupplier = await this.brandSupplierRepository.save(supplier);

      await this.actionLogsService.logAction({
        userId: user.user_id,
        actionType: 'CREATE',
        entityType: 'BrandSupplier',
        entityId: savedSupplier.id,
        newValue: savedSupplier,
      });

      return savedSupplier;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
  }

  async replace(id: number, createBrandSupplierDto: CreateBrandSupplierDto, user: User): Promise<BrandSupplier> {
  const existing = await this.findOne(id);
  const oldValues = { ...existing };

  try {
    const supplier = this.brandSupplierRepository.create({
      ...createBrandSupplierDto,
      id, // Changed from supplierId to id
    });
    
    const updatedSupplier = await this.brandSupplierRepository.save(supplier);

    await this.actionLogsService.logAction({
      userId: user.user_id,
      actionType: 'UPDATE',
      entityType: 'BrandSupplier',
      entityId: updatedSupplier.id, // Changed from supplierId to id
      oldValue: oldValues,
      newValue: updatedSupplier,
    });

    return updatedSupplier;
  } catch (error) {
    if (error.code === '23505') {
      throw new ConflictException('El email ya está registrado');
    }
    throw error;
  }
}

  async update(id: number, updateBrandSupplierDto: UpdateBrandSupplierDto, user: User): Promise<BrandSupplier> {
    const supplier = await this.findOne(id);
    const oldValues = { ...supplier };

    try {
      Object.assign(supplier, updateBrandSupplierDto);
      const updatedSupplier = await this.brandSupplierRepository.save(supplier);

      await this.actionLogsService.logAction({
        userId: user.user_id,
        actionType: 'UPDATE',
        entityType: 'BrandSupplier',
        entityId: updatedSupplier.id,
        oldValue: oldValues,
        newValue: updatedSupplier,
      });

      return updatedSupplier;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
  }

  async remove(id: number, user: User): Promise<void> {
  const supplier = await this.findOne(id);
  
  await this.actionLogsService.logAction({
    userId: user.user_id,
    actionType: 'DELETE',
    entityType: 'BrandSupplier',
    entityId: supplier.id, // Changed from supplierId to id
    oldValue: supplier,
  });

  const result = await this.brandSupplierRepository.delete(id);

  if (result.affected === 0) {
    throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
  }
}
}