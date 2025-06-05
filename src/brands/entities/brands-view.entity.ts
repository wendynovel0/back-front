import { ViewEntity, ViewColumn } from 'typeorm';
import { IsOptional, ValidateNested } from 'class-validator';
import { DateRangeFilterDto } from '../../common/dto/date-range-filter.dto';
import { Type } from 'class-transformer';

@ViewEntity({ name: 'brands_view' })
export class BrandView {
  @ViewColumn()
  brand_id: number;

  @ViewColumn()
  brand_name: string;

  @ViewColumn()
  description: string;

  @ViewColumn()
  brand_is_active: boolean;

  @ViewColumn()
  created_at: Date;

  @ViewColumn()
  updated_at: Date;

  @ViewColumn()
  deleted_at: Date | null;

  @ViewColumn()
  supplier_id: number | null;

  @ViewColumn()
  supplier_name: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeFilterDto)
  dateFilter?: DateRangeFilterDto;
}
