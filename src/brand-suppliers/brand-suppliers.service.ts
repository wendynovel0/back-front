import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BrandSupplier } from './entities/brand-supplier.entity';
import { CreateBrandSupplierDto } from './dto/create-brand-supplier.dto';
import { UpdateBrandSupplierDto } from './dto/update-brand-supplier.dto';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { User } from '../users/entities/user.entity';
import { BrandSuppliersView } from './entities/brand-suppliers-view.entity';

@Injectable()
export class BrandSuppliersService {
  constructor(
    @InjectRepository(BrandSupplier)
    private readonly brandSupplierRepository: Repository<BrandSupplier>,
    @InjectRepository(BrandSuppliersView)
    private readonly brandSuppliersViewRepository: Repository<BrandSuppliersView>,
    private readonly actionLogsService: ActionLogsService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters: {
  search?: string;
  createdStartDate?: string;
  createdEndDate?: string;
  updatedStartDate?: string;
  updatedEndDate?: string;
  brandIds?: number[];
}): Promise<BrandSuppliersView[]> {
  const {
    search,
    createdStartDate,
    createdEndDate,
    updatedStartDate,
    updatedEndDate,
    brandIds
  } = filters;

  // Validación de fechas de creación
  if ((createdStartDate && !createdEndDate) || (!createdStartDate && createdEndDate)) {
    throw new BadRequestException('Debe proporcionar ambas fechas: createdStartDate y createdEndDate');
  }

  if (createdStartDate && createdEndDate) {
    const start = new Date(createdStartDate);
    const end = new Date(createdEndDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Fechas inválidas, formato esperado YYYY-MM-DD');
    }
    if (start > end) {
      throw new BadRequestException('createdStartDate no puede ser mayor que createdEndDate');
    }
    if (end > now) {
      throw new BadRequestException('createdEndDate no puede ser una fecha futura');
    }
  }

  // Validación de fechas de edición
  if ((updatedStartDate && !updatedEndDate) || (!updatedStartDate && updatedEndDate)) {
    throw new BadRequestException('Debe proporcionar ambas fechas: updatedStartDate y updatedEndDate');
  }

  if (updatedStartDate && updatedEndDate) {
    const start = new Date(updatedStartDate);
    const end = new Date(updatedEndDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Fechas inválidas, formato esperado YYYY-MM-DD');
    }
    if (start > end) {
      throw new BadRequestException('updatedStartDate no puede ser mayor que updatedEndDate');
    }
    if (end > now) {
      throw new BadRequestException('updatedEndDate no puede ser una fecha futura');
    }
  }

  const query = this.brandSuppliersViewRepository
    .createQueryBuilder('supplier');

  if (search) {
    query.andWhere(
      '(LOWER(supplier.supplier_name) LIKE LOWER(:search) OR LOWER(supplier.contact_person) LIKE LOWER(:search) OR LOWER(supplier.email) LIKE LOWER(:search) OR LOWER(supplier.brand_name) LIKE LOWER(:search))',
      { search: `%${search}%` }
    );
  }

  if (createdStartDate && createdEndDate) {
    query.andWhere('supplier.created_at BETWEEN :start AND :end', {
      start: createdStartDate,
      end: createdEndDate
    });
  }

  if (updatedStartDate && updatedEndDate) {
    query.andWhere('supplier.updated_at BETWEEN :startU AND :endU', {
      startU: updatedStartDate,
      endU: updatedEndDate
    });
  }

  if (brandIds && brandIds.length > 0) {
    query.andWhere('supplier.brand_id IN (:...brandIds)', { brandIds });
  }

  return query.orderBy('supplier.supplier_name', 'ASC').getMany();
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