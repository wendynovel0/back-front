import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { BrandView } from './entities/brands-view.entity';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

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

    await this.actionLogsService.logAction({
      userId: performedBy,
      actionType: 'DELETE',
      entityType: 'brand',
      entityId: brand.id,
      oldValue: brand,
      ipAddress: ip,
    });

    await this.brandRepository.remove(brand);
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
  brandName?: string;
  supplierId?: number;
  isActive?: boolean;
  createdStartDate?: string;
  createdEndDate?: string;
  updatedStartDate?: string;
  updatedEndDate?: string;
}): Promise<BrandView[]> {
  const query = this.brandsViewRepository.createQueryBuilder('brand');
  const now = new Date();

  if (filters.brandName) {
    query.andWhere('LOWER(brand.brand_name) LIKE LOWER(:brandName)', {
      brandName: `%${filters.brandName}%`,
    });
  }

  if (filters.isActive !== undefined) {
    query.andWhere('brand.brand_is_active = :isActive', { isActive: filters.isActive });
  }

  if (filters.createdStartDate && !filters.createdEndDate) {
    throw new BadRequestException('Debe proporcionar una fecha de fin si se especifica la fecha de inicio para "created_at".');
  }

  if (filters.updatedStartDate && !filters.updatedEndDate) {
    throw new BadRequestException('Debe proporcionar una fecha de fin si se especifica la fecha de inicio para "updated_at".');
  }

  if (filters.createdStartDate && filters.createdEndDate) {
    const start = new Date(filters.createdStartDate);
    const end = new Date(filters.createdEndDate);

    if (start > end) {
      throw new BadRequestException('La fecha de inicio de creación no puede ser mayor que la de fin.');
    }
    if (start > now || end > now) {
      throw new BadRequestException('No se permiten fechas futuras para "created_at".');
    }

    query.andWhere('brand.created_at BETWEEN :start AND :end', {
      start,
      end,
    });
  }

  if (filters.updatedStartDate && filters.updatedEndDate) {
    const startUpdate = new Date(filters.updatedStartDate);
    const endUpdate = new Date(filters.updatedEndDate);

    if (startUpdate > endUpdate) {
      throw new BadRequestException('La fecha de inicio de actualización no puede ser mayor que la de fin.');
    }
    if (startUpdate > now || endUpdate > now) {
      throw new BadRequestException('No se permiten fechas futuras para "updated_at".');
    }

    query.andWhere('brand.updated_at BETWEEN :startUpdate AND :endUpdate', {
      startUpdate,
      endUpdate,
    });
  }

  if (filters.supplierId) {
    query.andWhere('brand.supplier_id = :supplierId', { supplierId: filters.supplierId });
  }

  const brands = await query.orderBy('brand.created_at', 'DESC').getMany();

  return brands.map(brand => ({
    brand_id: brand.brand_id,
    brand_name: brand.brand_name,
    description: brand.description,
    created_at: brand.created_at,
    updated_at: brand.updated_at,
    supplier_id: brand.supplier_id,
    supplier_name: brand.supplier_name,
  }));
}
}
