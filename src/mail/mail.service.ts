import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mailFrom: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService
  ) {
    this.mailFrom = `"${this.configService.get('MAIL_FROM_NAME')}" <${this.configService.get('MAIL_FROM_ADDRESS')}>`;
  }

  async sendConfirmationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const activationUrl = `${frontendUrl}/auth/confirm-email?token=${encodeURIComponent(token)}`;


    try {
      await this.mailerService.sendMail({
        from: this.mailFrom,
        to: email,
        subject: `Activa tu cuenta en Hoken`,
        template: 'confirmation',
        context: {
          email,
          activationUrl,
          frontendUrl,
          supportEmail: this.configService.get('MAIL_SUPPORT_ADDRESS', 'soporte@hoken.com'),
        },
      });
      this.logger.log(`Correo de activación enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando correo a ${email}: ${error.message}`, error.stack);
      throw new Error('No se pudo enviar el correo de confirmación');
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await this.mailerService.sendMail({
        from: this.mailFrom,
        to: email,
        subject: `Restablece tu contraseña en Hoken`,
        template: 'password-reset',
        context: {
          email,
          resetUrl,
          expirationHours: 24,
        },
      });
      this.logger.log(`Correo de restablecimiento enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando correo a ${email}: ${error.message}`, error.stack);
      throw new Error('No se pudo enviar el correo de restablecimiento');
    }
  }

  async sendActivationSuccessEmail(email: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const backendUrl = this.configService.get('BACKEND_URL');

    try {
      await this.mailerService.sendMail({
        from: this.mailFrom,
        to: email,
        subject: `¡Bienvenido a TiendApi - Cuenta activada!`,
        template: 'activation-success',
        context: {
          email,
          frontendUrl,
          backendUrl,
          loginUrl: `${frontendUrl}/login`,
          supportEmail: this.configService.get('MAIL_SUPPORT_ADDRESS', 'soporte@tiendapi.com'),
        },
      });
      this.logger.log(`Correo de bienvenida enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando correo de bienvenida a ${email}: ${error.message}`, error.stack);
    }
  }
}