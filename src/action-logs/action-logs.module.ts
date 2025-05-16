import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionLogsService } from './action-logs.service';
import { ActionLogsController } from './action-logs.controller';
import { ActionLog } from './entities/action-log.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActionLog, User]),
    AuthModule,
  ],
  controllers: [ActionLogsController],
  providers: [ActionLogsService],
  exports: [ActionLogsService], // Exportamos para usar en otros módulos
})
export class LogsModule {}