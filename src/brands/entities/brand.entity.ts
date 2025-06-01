// src/brands/entities/brand.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { BrandSupplier } from '../../brand-suppliers/entities/brand-supplier.entity';

@Entity({ name: 'brands' })
export class Brand {
  @PrimaryGeneratedColumn({ name: 'brand_id', type: 'bigint' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_at', type: 'date', default: () => 'CURRENT_DATE' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'date', default: () => 'CURRENT_DATE' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'date', nullable: true })
  deletedAt?: Date | null;

  @OneToMany(() => Product, (product) => product.brand)
  products: Product[];

  @OneToMany(() => BrandSupplier, (supplier) => supplier.brand)
  suppliers: BrandSupplier[];
}
