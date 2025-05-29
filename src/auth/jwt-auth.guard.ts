import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { normalizeToken } from '../common/utils/token.utils';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = normalizeToken(request.headers.authorization || '');

    console.log('[guard] Token recibido para validar:', token);
    console.log('[guard] Token length:', token.length);
    console.log('[guard] Token buscado:', `"${token}"`);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    // Primero validamos el token con la estrategia JWT
    const can = (await super.canActivate(context)) as boolean;
    console.log('[guard] Resultado super.canActivate:', can);
    if (!can) return false;

    // Luego revisamos si el token está en blacklist (token inválido por logout)
    const isBlacklisted = await this.authService.isBlacklisted(token);
    console.log('[guard] ¿Token en blacklist?', isBlacklisted);

    if (isBlacklisted) {
      // Si está en blacklist, bloqueamos acceso con excepción
      throw new UnauthorizedException('Token en lista negra o sesión cerrada');
    }

    // Si todo bien, permitimos acceso
    return true;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido');
    }
    return user;
  }
}
