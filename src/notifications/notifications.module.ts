import { Module } from '@nestjs/common';
import { NovuService } from './novu.service';
import { ConfigModule } from '@nestjs/config';

@Module({
   imports: [ConfigModule],
  providers: [NovuService],
  exports: [NovuService], 
})
export class NotificationsModule {}
