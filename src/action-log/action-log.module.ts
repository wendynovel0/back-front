import { Module } from '@nestjs/common';
import { ActionLogService } from './action-log.service';

@Module({
  providers: [ActionLogService]
})
export class ActionLogModule {}
