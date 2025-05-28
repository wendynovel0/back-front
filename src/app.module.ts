import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

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
 
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') !== 'production',
        ssl: { rejectUnauthorized: false },
       
        extra: {
          connectionLimit: 10, 
          ssl: configService.get('NODE_ENV') === 'production' 
               ? { rejectUnauthorized: false } 
               : false
        }
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule)
  ]
})
export class AppModule {}