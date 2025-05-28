import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: config => ({
        JWT_SECRET: config.JWT_SECRET || (() => { throw new Error('JWT_SECRET es requerido') })(),
        JWT_EXPIRES_IN: config.JWT_EXPIRES_IN || '1h',
        DATABASE_URL: config.DATABASE_URL,
        NODE_ENV: config.NODE_ENV || 'development',
        SALT_ROUNDS: parseInt(config.SALT_ROUNDS) || 12
      })
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      ssl: { rejectUnauthorized: false }
    }),
    AuthModule
  ]
})
export class AppModule {}