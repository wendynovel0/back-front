import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { Brand } from '../brands/entities/brand.entity';
import { AuthModule } from '../auth/auth.module';
import { LogsModule } from '../action-logs/action-logs.module';
import { User } from '../users/entities/user.entity';
import { ActionLog } from '../action-logs/entities/action-log.entity';
import { ProductView } from './entities/product-view.entity';

@Module({
  imports: [
    // Importar las entidades necesarias
    TypeOrmModule.forFeature([
      Product,
      Brand,
      User,
      ActionLog,
      ProductView
    ]),
    
    // Importar módulos requeridos
    AuthModule,     // Para autenticación JWT
    LogsModule,     // Para registro de acciones
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // Exportar si otros módulos necesitan usar ProductsService
})
export class ProductsModule {}