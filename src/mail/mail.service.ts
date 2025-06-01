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
    const appName = this.configService.get('APP_NAME', 'Hoken');

    try {
      await this.mailerService.sendMail({
        from: this.mailFrom,
        to: email,
        subject: `Activa tu cuenta en ${appName}`,
        template: 'confirmation',
        context: {
          email,
          confirmUrl: activationUrl,
          appName,
          frontendUrl,
          supportEmail: this.configService.get('MAIL_SUPPORT_ADDRESS', 'soporte@hoken.com')
        }
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
    const appName = this.configService.get('APP_NAME', 'Hoken');

    try {
      await this.mailerService.sendMail({
        from: this.mailFrom,
        to: email,
        subject: `Restablece tu contraseña en ${appName}`,
        template: 'password-reset',
        context: {
          email,
          resetUrl,
          appName,
          expirationHours: 24
        }
      });
      this.logger.log(`Correo de restablecimiento enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando correo a ${email}: ${error.message}`, error.stack);
      throw new Error('No se pudo enviar el correo de restablecimiento');
    }
  }

  async sendActivationSuccessEmail(email: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const appName = this.configService.get('APP_NAME', 'Hoken');

    try {
      await this.mailerService.sendMail({
        from: this.mailFrom,
        to: email,
        subject: `¡Bienvenido a ${appName} - Cuenta activada!`,
        template: 'activation-success',
        context: {
          email,
          frontendUrl,
          appName,
          loginUrl: `${frontendUrl}/login`,
          supportEmail: this.configService.get('MAIL_SUPPORT_ADDRESS', 'soporte@hoken.com')
        }
      });
      this.logger.log(`Correo de bienvenida enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando correo de bienvenida a ${email}: ${error.message}`, error.stack);
      // No lanzamos error para no afectar el flujo principal
    }
  }
}