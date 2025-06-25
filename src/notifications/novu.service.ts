import { Injectable, Logger } from '@nestjs/common';
import { Novu } from '@novu/node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NovuService {
  private readonly logger = new Logger(NovuService.name);
  private readonly novu: Novu;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('NOVU_SECRET_KEY');
    if (!secretKey) {
      throw new Error('NOVU_SECRET_KEY no está definido en .env');
    }
    this.novu = new Novu(secretKey);
  }

  async registerSubscriber(userId: string, email: string, firstName: string) {
    await this.novu.subscribers.identify(userId, { email, firstName });
  }

  async sendConfirmationEmail(userId: string, email: string, firstName: string, confirmationUrl: string) {
    await this.registerSubscriber(userId, email, firstName);
    await this.novu.trigger('confirmar-cuenta', {
      to: { subscriberId: userId },
      payload: { firstName, confirmationUrl },
    });
  }
}
