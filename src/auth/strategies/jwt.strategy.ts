import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthService } from '../auth.service'; // asegúrate de que el path es correcto

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true, 
    });
  }

  async validate(req: Request, payload: JwtPayload) {
  const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

  if (!token) {
    throw new UnauthorizedException('Token no proporcionado');
  }

  const isBlacklisted = await this.authService.isBlacklisted(token);
  if (isBlacklisted) {
    throw new UnauthorizedException('Token revocado');
  }

  return {
    user_id: payload.sub,
    email: payload.email,
    is_active: payload.is_active,
  };
}

}
