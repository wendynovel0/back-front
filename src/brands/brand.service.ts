import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { BrandsView } from './entities/brands-view.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(BrandsView)
    private readonly brandsViewRepository: Repository<BrandsView>,
    private actionLogsService: ActionLogsService,
  ) {}

  async findAll(includeInactive = false): Promise<Brand[]> {
    const where = includeInactive ? {} : { isActive: true };
    return this.brandRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    return brand;
  }

  async create(createBrandDto: CreateBrandDto, user: User): Promise<Brand> {
    try {
      const brand = this.brandRepository.create({
        ...createBrandDto,
        isActive: true,
      });

      const savedBrand = await this.brandRepository.save(brand);

      await this.actionLogsService.logAction({
        userId: user.user_id,
        actionType: 'CREATE',
        entityType: 'Brand',
        entityId: savedBrand.id,
        newValue: savedBrand,
      });

      return savedBrand;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Brand name already exists');
      }
      throw error;
    }
  }

  async update(id: number, updateBrandDto: UpdateBrandDto, user: User): Promise<Brand> {
    const brand = await this.findOne(id);
    const oldValues = { ...brand };

    try {
      Object.assign(brand, updateBrandDto);
      const updatedBrand = await this.brandRepository.save(brand);

      await this.actionLogsService.logAction({
        userId: user.user_id,
        actionType: 'UPDATE',
        entityType: 'Brand',
        entityId: updatedBrand.id,
        oldValue: oldValues,
        newValue: updatedBrand,
      });

      return updatedBrand;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Brand name already exists');
      }
      throw error;
    }
  }

  async deactivate(id: number, user: User): Promise<Brand> {
    const brand = await this.findOne(id);
    brand.isActive = false;
    
    await this.actionLogsService.logAction({
      userId: user.user_id,
      actionType: 'DEACTIVATE',
      entityType: 'Brand',
      entityId: brand.id,
      oldValue: { isActive: true },
      newValue: { isActive: false },
    });

    return this.brandRepository.save(brand);
  }

  async activate(id: number, user: User): Promise<Brand> {
    const brand = await this.findOne(id);
    brand.isActive = true;
    
    await this.actionLogsService.logAction({
      userId: user.user_id,
      actionType: 'ACTIVATE',
      entityType: 'Brand',
      entityId: brand.id,
      oldValue: { isActive: false },
      newValue: { isActive: true },
    });

    return this.brandRepository.save(brand);
  }
}