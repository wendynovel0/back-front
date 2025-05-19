import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'products_view' })
export class ProductView {
  @ViewColumn({ name: 'product_id' })
  productId: number;

  @ViewColumn({ name: 'code' })
  code: string;

  @ViewColumn({ name: 'product_name' })
  productName: string;

  @ViewColumn({ name: 'description' })
  description?: string;

  @ViewColumn({ name: 'price' })
  price: number;

  @ViewColumn({ name: 'created_at' })
  createdAt: Date;

  @ViewColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ViewColumn({ name: 'brand_id' })
  brandId: number;

  @ViewColumn({ name: 'brand_name' })
  brandName: string;

  @ViewColumn({ name: 'supplier_id' })
  supplierId: number;

  @ViewColumn({ name: 'supplier_name' })
  supplierName: string;
}
