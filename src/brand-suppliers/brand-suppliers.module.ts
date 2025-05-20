import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandSuppliersService } from './brand-suppliers.service';
import { BrandSuppliersController } from './brand-suppliers.controller';
import { BrandSupplier } from './entities/brand-supplier.entity';
import { BrandSuppliersView } from './entities/brand-suppliers-view.entity';
import { BrandsModule } from '../brands/brands.module';
import { LogsModule } from '../action-logs/action-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BrandSupplier, BrandSuppliersView]),
    BrandsModule,
    LogsModule,
  ],
  controllers: [BrandSuppliersController],
  providers: [BrandSuppliersService],
  exports: [BrandSuppliersService],
})
export class BrandSuppliersModule {}