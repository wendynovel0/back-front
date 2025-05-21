import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { BrandsView } from './entities/brands-view.entity';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,

    @InjectRepository(BrandsView)
    private readonly brandsViewRepository: Repository<BrandsView>,

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

  async findAllWithFilters(filters: {
    name?: string;
    createdStartDate?: string;
    createdEndDate?: string;
    updatedStartDate?: string;
    updatedEndDate?: string;
  }): Promise<BrandsView[]> {
    const query = this.brandsViewRepository.createQueryBuilder('brand');

    if (filters.name) {
      query.andWhere('LOWER(brand.brand_name) LIKE LOWER(:name)', { name: `%${filters.name}%` });
    }

    if (filters.createdStartDate && filters.createdEndDate) {
      query.andWhere('brand.created_at BETWEEN :start AND :end', {
        start: filters.createdStartDate,
        end: filters.createdEndDate,
      });
    }

    if (filters.updatedStartDate && filters.updatedEndDate) {
      query.andWhere('brand.updated_at BETWEEN :startUpdate AND :endUpdate', {
        startUpdate: filters.updatedStartDate,
        endUpdate: filters.updatedEndDate,
      });
    }

    return query.getMany();
  }
}
async findAllWithFilters(filters: {
  name?: string;
  createdStartDate?: string;
  createdEndDate?: string;
  updatedStartDate?: string;
  updatedEndDate?: string;
  isActive?: boolean;
}): Promise<Brand[]> {
  const query = this.brandRepository.createQueryBuilder('brand');

  if (filters.name) {
    query.andWhere('brand.name ILIKE :name', { name: `%${filters.name}%` });
  }

  if (filters.createdStartDate) {
    query.andWhere('brand.createdAt >= :createdStartDate', { createdStartDate: filters.createdStartDate });
  }

  if (filters.createdEndDate) {
    query.andWhere('brand.createdAt <= :createdEndDate', { createdEndDate: filters.createdEndDate });
  }

  if (filters.updatedStartDate) {
    query.andWhere('brand.updatedAt >= :updatedStartDate', { updatedStartDate: filters.updatedStartDate });
  }

  if (filters.updatedEndDate) {
    query.andWhere('brand.updatedAt <= :updatedEndDate', { updatedEndDate: filters.updatedEndDate });
  }

  if (filters.isActive !== undefined) {
    query.andWhere('brand.isActive = :isActive', { isActive: filters.isActive });
  }

  return query.getMany();
}
