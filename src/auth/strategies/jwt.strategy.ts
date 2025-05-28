import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface'; // Opcional: tipado seguro

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extrae el token del header 'Authorization: Bearer <token>'
      ignoreExpiration: false, // Rechaza tokens expirados
      secretOrKey: configService.get<string>('JWT_SECRET'), // Usa la misma clave que en JwtModule
    });
  }

  async validate(payload: JwtPayload) { // Valida y devuelve el payload decodificado
    return { 
      userId: payload.sub, 
      email: payload.email,
      isActive: payload.iat,
    };
  }
}