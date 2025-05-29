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
  constructor(private authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
  const activated = await super.canActivate(context);
  if (!activated) return false;

  const request = context.switchToHttp().getRequest();
  const token = this.extractTokenFromHeader(request);

  if (!token) {
    console.warn('[JwtAuthGuard] No se encontró token en el header Authorization');
    throw new UnauthorizedException('Token no proporcionado');
  }

  const isBlacklisted = await this.authService.isBlacklisted(token);
  if (isBlacklisted) {
    console.warn('[JwtAuthGuard] Token está en la blacklist');
    throw new UnauthorizedException('Token invalidado (blacklist)');
  }

  return true;
}


  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    return authHeader?.split(' ')[1] || null;
  }
}
