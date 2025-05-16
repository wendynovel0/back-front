import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsService } from './brand.service';
import { BrandsController } from './brands.controller';
import { Brand } from './entities/brand.entity';
import { AuthModule } from '../auth/auth.module';
import { LogsModule } from '../action-logs/action-logs.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Brand, User]),
    AuthModule,
    LogsModule,
  ],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}