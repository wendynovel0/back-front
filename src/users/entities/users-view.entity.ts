import { ViewEntity, ViewColumn } from 'typeorm';
import { IsOptional, ValidateNested } from 'class-validator';
import { DateRangeFilterDto } from '../../common/dto/date-range-filter.dto';
import { Type } from 'class-transformer';

@ViewEntity({ name: 'users_view' })
export class UsersView {
  @ViewColumn()
  user_id: number;

  @ViewColumn()
  email: string;

  @ViewColumn()
  is_active: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeFilterDto)
  dateFilter?: DateRangeFilterDto;
}
