import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service'; 
import { MailController } from './mail.controller'; 
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
  transport: {
    host: config.get('MAIL_HOST'),
    port: config.get<number>('MAIL_PORT'),
    secure: false,
    auth: {
      user: config.get('MAIL_USER'),
      pass: config.get('MAIL_PASS'),
    },
  },
  defaults: {
    from: `"${config.get('MAIL_FROM_NAME')}" <${config.get('MAIL_FROM_ADDRESS')}>`,
  },
  template: {
    dir: join(__dirname, 'templates'),
    adapter: new HandlebarsAdapter(),
    options: {
      strict: true,
    },
  },
}),
      inject: [ConfigService],
    }),
  ],
  controllers: [MailController], 
  providers: [MailService], 
  exports: [MailService], 
})
export class MailModule {}