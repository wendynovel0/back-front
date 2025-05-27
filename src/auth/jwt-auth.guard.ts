import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const can = (await super.canActivate(context)) as boolean;
    if (!can) return false;

    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    if (await this.authService.isBlacklisted(token)) {
      throw new UnauthorizedException('Token inválido o cerrado sesión');
    }

    return true;
  }
}
