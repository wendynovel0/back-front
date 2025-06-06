import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionLogsService } from './action-logs.service';
import { ActionLogsController } from './action-logs.controller';
import { ActionLog } from './entities/action-log.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { LogsView } from './entities/logs-view.entity';
import { forwardRef} from '@nestjs/common';
@Module({
  imports: [
    TypeOrmModule.forFeature([ActionLog, User, LogsView]),
    forwardRef(() => AuthModule),
  ],
  controllers: [ActionLogsController],
  providers: [ActionLogsService],
  exports: [ActionLogsService, TypeOrmModule.forFeature([ActionLog])],
})
export class LogsModule {}