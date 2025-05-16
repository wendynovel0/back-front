import { Brand } from '../../brands/entities/brand.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { DateAudit } from '../../common/entities/date-audit.entity';

@Entity('brand_suppliers')
export class BrandSupplier extends DateAudit {
  @PrimaryGeneratedColumn({ name: 'supplier_id' })
  supplierId: number;

  @Column({ name: 'name', length: 100, nullable: false })
  name: string;

  @Column({ name: 'contact_person', length: 100, nullable: true })
  contactPerson: string;

  @Column({ name: 'email', length: 100, nullable: false, unique: true })
  email: string;

  @Column({ name: 'phone', length: 10, nullable: true })
  phone: string;

  @Column({ name: 'address', type: 'text', nullable: true })
  address: string;

  @ManyToOne(() => Brand, (brand) => brand.suppliers)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}