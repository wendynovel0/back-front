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
      throw new Error('NOVU_SECRET_KEY no está definido en las variables de entorno');
    }

    this.novu = new Novu(secretKey, {
      backendUrl: 'https://api.novu.co' // Asegura la URL correcta
    });
    this.logger.log(`🔐 Novu inicializado correctamente`);
  }

  async registerSubscriber(userId: string, email: string) {
    try {
      await this.novu.subscribers.identify(userId, { 
        email,
        data: {
          subscriberId: userId,
          email
        }
      });
      this.logger.log(`📝 Suscriptor ${userId} registrado en Novu`);
    } catch (error) {
      this.logger.error(`❌ Error registrando suscriptor en Novu: ${error.message}`);
      throw error;
    }
  }

}
