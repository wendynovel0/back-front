// src/brand-suppliers/entities/brand-suppliers-view.entity.ts

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('brand_suppliers_view')
export class BrandSuppliersView {
  @PrimaryColumn({ name: 'supplier_id' })
  supplierId: number;

  @Column({ name: 'supplier_name' })
  supplierName: string;

  @Column({ name: 'contact_person' })
  contactPerson: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  address: string;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'brand_id' })
  brandId: number;

  @Column({ name: 'brand_name' })
  brandName: string;
}
