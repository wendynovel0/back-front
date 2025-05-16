import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { User } from './entities/user.entity';
import { LogsModule } from '../logs/logs.module';
import { AuthModule } from '../auth/auth.module'; // asegúrate que exista

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    LogsModule,
    forwardRef(() => AuthModule), 
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
