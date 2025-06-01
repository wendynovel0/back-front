import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BrandSupplier } from './entities/brand-supplier.entity';
import { CreateBrandSupplierDto } from './dto/create-brand-supplier.dto';
import { UpdateBrandSupplierDto } from './dto/update-brand-supplier.dto';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { User } from '../users/entities/user.entity';
import { BrandSupplierView } from './entities/brand-suppliers-view.entity';
import { DateRangeFilterDto } from '../common/dto/date-range-filter.dto';
import { applyDateRangeFilter } from '../common/utils/query.utils'; 

@Injectable()
export class BrandSuppliersService {
  constructor(
    @InjectRepository(BrandSupplier)
    private readonly brandSupplierRepository: Repository<BrandSupplier>,
    @InjectRepository(BrandSupplierView)
    private readonly brandSuppliersViewRepository: Repository<BrandSupplierView>,
    private readonly actionLogsService: ActionLogsService,
    private readonly dataSource: DataSource,
  ) {}

 findAll(filters: {
  search?: string;
  brandIds?: number[];
  isActive?: boolean;
  dateFilter?: {
    dateType: 'created_at' | 'updated_at' | 'deleted_at';
    startDate: string;
    endDate: string;
  };
}): Promise<BrandSupplierView[]> {
  const { search, brandIds, isActive, dateFilter } = filters;

  const now = new Date();
  const query = this.brandSuppliersViewRepository.createQueryBuilder('supplier');

  // Validación del rango de fechas combinado
  if (dateFilter) {
    const { dateType, startDate, endDate } = dateFilter;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!dateType || !startDate || !endDate) {
      throw new BadRequestException('Debe proporcionar dateType, startDate y endDate.');
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Fechas inválidas, formato esperado: YYYY-MM-DD');
    }

    if (start > end) {
      throw new BadRequestException('startDate no puede ser mayor que endDate.');
    }

    if (end > now) {
      throw new BadRequestException('endDate no puede ser una fecha futura.');
    }

    query.andWhere(`supplier.${dateType} BETWEEN :start AND :end`, {
      start: startDate,
      end: endDate
    });
  }

  // Búsqueda por texto
  if (search) {
    query.andWhere(
      `(LOWER(supplier.supplier_name) LIKE LOWER(:search)
        OR LOWER(supplier.contact_person) LIKE LOWER(:search)
        OR LOWER(supplier.email) LIKE LOWER(:search)
        OR LOWER(supplier.brand_name) LIKE LOWER(:search))`,
      { search: `%${search}%` }
    );
  }

  // Filtrado por marcas
  if (brandIds?.length) {
    query.andWhere('supplier.brand_id IN (:...brandIds)', { brandIds });
  }

  // Filtrado por estado activo
  if (typeof isActive === 'boolean') {
    query.andWhere('supplier.supplier_is_active = :isActive', { isActive });
  }

  return query.orderBy('supplier.supplier_name', 'DESC').getMany();
}


  
async findOne(id: number): Promise<BrandSupplier> {
  const supplier = await this.brandSupplierRepository.findOne({
    where: { id },
    relations: ['brand'], 
  });
  
  if (!supplier) {
    throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
  }
  return supplier;
}


  async create(createBrandSupplierDto: CreateBrandSupplierDto, user: User): Promise<BrandSupplier> {
  try {
    // Crear entidad con relación a la marca
    const supplier = this.brandSupplierRepository.create({
      ...createBrandSupplierDto,
      brand: { id: createBrandSupplierDto.brandId }, // referencia a la relación
    });

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