import { IsDateString, IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DateRangeFilterDto {
  @ApiProperty({
    description: 'Campo de fecha a filtrar',
    enum: ['created_at', 'updated_at', 'deleted_at'],
    example: 'created_at',
  })
  @IsIn(['created_at', 'updated_at', 'deleted_at'])
  dateType: 'created_at' | 'updated_at' | 'deleted_at';

  @ApiProperty({
    description: 'Fecha de inicio (formato YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Fecha de fin (formato YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}
