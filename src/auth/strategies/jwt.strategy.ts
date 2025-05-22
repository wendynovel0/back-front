import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secretOrKey = configService.get<string>('JWT_SECRET');
    
    if (!secretOrKey) {
      throw new Error('JWT_SECRET is not defined in configuration');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretOrKey, // Asegúrate que siempre tenga valor
    });
  }

  async validate(payload: any) {
    return { 
      user_id: payload.sub, 
      email: payload.email 
    };
  }
}