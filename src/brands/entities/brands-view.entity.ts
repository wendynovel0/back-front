import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'brands_view',
})
export class BrandsView {
  @ViewColumn()
  brand_id: number;

  @ViewColumn()
  brand_name: string;

  @ViewColumn()
  description: string;

  @ViewColumn()
  created_at: Date;

  @ViewColumn()
  updated_at: Date;

  @ViewColumn()
  supplier_id: number;

  @ViewColumn()
  supplier_name: string;
}
