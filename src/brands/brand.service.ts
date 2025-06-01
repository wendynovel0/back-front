import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { BrandView } from './entities/brands-view.entity';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { formatResponse } from '../common/utils/response-format';
import { DateRangeFilterDto } from '../common/dto/date-range-filter.dto';
import { applyDateRangeFilter } from '../common/utils/query.utils'; 

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,

    @InjectRepository(BrandView)
    private readonly brandsViewRepository: Repository<BrandView>,

    private readonly actionLogsService: ActionLogsService,
  ) {}

  async create(createBrandDto: CreateBrandDto, performedBy: number, ip?: string): Promise<Brand> {
    const brand = this.brandRepository.create(createBrandDto);
    const savedBrand = await this.brandRepository.save(brand);

    await this.actionLogsService.logAction({
      userId: performedBy,
      actionType: 'CREATE',
      entityType: 'brand',
      entityId: savedBrand.id,
      newValue: savedBrand,
      ipAddress: ip,
    });

    return savedBrand;
  }

  async findAll(): Promise<Brand[]> {
    return this.brandRepository.find();
  }

  async findOne(id: number): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(
    id: number,
    updateBrandDto: UpdateBrandDto,
    performedBy: number,
    ip?: string,
  ): Promise<Brand> {
    const brand = await this.findOne(id);
    const oldValue = { ...brand };

    Object.assign(brand, updateBrandDto);
    const updatedBrand = await this.brandRepository.save(brand);

    await this.actionLogsService.logAction({
      userId: performedBy,
      actionType: 'UPDATE',
      entityType: 'brand',
      entityId: updatedBrand.id,
      oldValue,
      newValue: updatedBrand,
      ipAddress: ip,
    });

    return updatedBrand;
  }

  async remove(id: number, performedBy: number, ip?: string): Promise<void> {
  const brand = await this.findOne(id);

  // Actualizar estado en vez de eliminar
  brand.isActive = false;
  brand.deletedAt = new Date();

  await this.actionLogsService.logAction({
    userId: performedBy,
    actionType: 'DELETE',
    entityType: 'brand',
    entityId: brand.id,
    oldValue: brand,
    ipAddress: ip,
  });

  await this.brandRepository.save(brand);
}


  async deactivate(id: number, performedBy: number, ip?: string): Promise<Brand> {
  const brand = await this.findOne(id);

  if (!brand.isActive) {
    return brand; // Ya está desactivada, opcional evitar duplicar acciones
  }

  const oldValue = { ...brand };

  brand.isActive = false;

  const updatedBrand = await this.brandRepository.save(brand);

  await this.actionLogsService.logAction({
    userId: performedBy,
    actionType: 'UPDATE',
    entityType: 'brand',
    entityId: brand.id,
    oldValue,
    newValue: updatedBrand,
    ipAddress: ip,
  });

  return updatedBrand;
}

async activate(id: number, performedBy: number, ip?: string): Promise<Brand> {
  const brand = await this.findOne(id);

  if (brand.isActive) {
    return brand; // Ya está activada, opcional evitar duplicar acciones
  }

  const oldValue = { ...brand };

  brand.isActive = true;

  const updatedBrand = await this.brandRepository.save(brand);

  await this.actionLogsService.logAction({
    userId: performedBy,
    actionType: 'UPDATE',
    entityType: 'brand',
    entityId: brand.id,
    oldValue,
    newValue: updatedBrand,
    ipAddress: ip,
  });

  return updatedBrand;
}


async findAllWithFilters(filters: {
  search?: string;
  isActive?: boolean;
  supplierIds?: number[];
  dateFilter?: DateRangeFilterDto;
}): Promise<any> {
  const query = this.brandsViewRepository.createQueryBuilder('brand');

  if (filters.search) {
    query.andWhere(
      `(
        LOWER(brand.brand_name) LIKE LOWER(:search)
        OR LOWER(brand.description) LIKE LOWER(:search)
        OR LOWER(brand.supplier_name) LIKE LOWER(:search)
      )`,
      { search: `%${filters.search}%` }
    );
  }

  if (filters.isActive !== undefined) {
    query.andWhere('brand.brand_is_active = :isActive', { isActive: filters.isActive });
  }

  if (filters.supplierIds?.length) {
    query.andWhere('brand.supplier_id IN (:...supplierIds)', {
      supplierIds: filters.supplierIds,
    });
  }

  if (filters.dateFilter) {
    const { dateType, startDate, endDate } = filters.dateFilter;

    if (!startDate || !endDate) {
      throw new BadRequestException('Debe especificar ambas fechas.');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    if (start > end) {
      throw new BadRequestException('La fecha de inicio no puede ser mayor que la fecha final.');
    }

    if (end > today) {
      throw new BadRequestException('La fecha final no puede ser futura.');
    }

    applyDateRangeFilter(query, 'brand', { dateType, startDate, endDate });
  }

  const brands = await query.orderBy('brand.created_at', 'DESC').getMany();

  const response = brands.map((brand) => ({
    brand_id: brand.brand_id,
    brand_name: brand.brand_name,
    description: brand.description,
    supplier_id: brand.supplier_id,
    supplier_name: brand.supplier_name,
    // No created_at ni updated_at
  }));

  return response;
}

// Método para obtener una vista mínima de la marca como nos dijo Russel
async findOneMinimal(id: number) {
  return this.brandRepository.findOne({
    where: { id },
    select: ['id', 'name', 'description', 'isActive'] 
  });
}
}