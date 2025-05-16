import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandSuppliersService } from './brand-suppliers.service';
import { BrandSuppliersController } from './brand-suppliers.controller';
import { BrandSupplier } from './entities/brand-supplier.entity';
import { BrandsModule } from '../brands/brands.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BrandSupplier]),
    BrandsModule,
    LogsModule,
  ],
  controllers: [BrandSuppliersController],
  providers: [BrandSuppliersService],
  exports: [BrandSuppliersService],
})
export class BrandSuppliersModule {}