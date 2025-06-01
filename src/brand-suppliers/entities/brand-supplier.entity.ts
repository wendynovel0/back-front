// src/brand-suppliers/entities/brand-supplier.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';

@Entity({ name: 'brand_suppliers' })
export class BrandSupplier {
  @PrimaryGeneratedColumn({ name: 'supplier_id', type: 'bigint' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'contact_person', type: 'varchar', length: 100, nullable: true })
  contactPerson?: string;

  @Column({ name: 'email', type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ name: 'phone', type: 'varchar', length: 15, nullable: true })
  phone?: string;

  @Column({ name: 'address', type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'brand_id', type: 'bigint' })
  brandId: number;

  @ManyToOne(() => Brand, (brand) => brand.suppliers)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_at', type: 'date', default: () => 'CURRENT_DATE' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'date', default: () => 'CURRENT_DATE' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'date', nullable: true })
  deletedAt?: Date;
}
