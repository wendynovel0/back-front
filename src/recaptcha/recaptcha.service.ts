import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RecaptchaService {
  private readonly secretKey = process.env.RECAPTCHA_SECRET_KEY;

  async verify(token: string): Promise<void> {
    console.log('RECAPTCHA_SECRET_KEY:', this.secretKey);
    const params = new URLSearchParams();
    params.append('secret', this.secretKey ?? '');
    params.append('response', token);

    console.log('Token recibido:', token);
    console.log('Secret usado:', this.secretKey);

    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    if (!data.success) {
      throw new UnauthorizedException('Falló la verificación de reCAPTCHA');
    }
  }
}
