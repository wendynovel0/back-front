// recaptcha.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RecaptchaService } from './recaptcha.service';

@Injectable()
export class RecaptchaGuard implements CanActivate {
  constructor(private readonly recaptchaService: RecaptchaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const recaptchaToken =
      request.body?.recaptchaToken ||
      request.headers['x-recaptcha-token'];
      console.log('recaptchaToken recibido:', recaptchaToken);

    if (!recaptchaToken) {
      throw new UnauthorizedException('Token de reCAPTCHA no proporcionado');
    }

    await this.recaptchaService.verify(recaptchaToken);
    return true;
  }
}
