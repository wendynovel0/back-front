import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { ProductsModule } from './products/products.module';
import { LogsModule } from './logs/logs.module';
import { BrandSuppliersModule } from './brand-suppliers/brand-suppliers.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false, // Desactivado completamente
        ssl: configService.get('NODE_ENV') === 'production' 
          ? { rejectUnauthorized: true } 
          : false,
        // Opciones adicionales para evitar problemas con NULL
        extra: {
          options: "--client_encoding=UTF8"
        },
        logging: ['error', 'warn'], // Solo mostrar logs importantes
      }),
      inject: [ConfigService],
    }),
    
    AuthModule,
    BrandsModule,
    ProductsModule,
    UsersModule,
    BrandSuppliersModule,
    LogsModule,
  ],
})
export class AppModule {}