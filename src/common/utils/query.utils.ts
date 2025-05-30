import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { DateRangeFilterDto } from '../dto/date-range-filter.dto';

export function applyDateRangeFilter<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  filter: DateRangeFilterDto
): SelectQueryBuilder<T> {
    const { dateType, startDate, endDate } = filter;

  if (!['created_at', 'updated_at', 'deleted_at'].includes(dateType)) {
    throw new Error('Campo de fecha no válido');
  }

  return qb.andWhere(`${alias}.${dateType} BETWEEN :startDate AND :endDate`, {
    startDate,
    endDate,
  });
}
