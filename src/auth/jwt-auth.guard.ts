import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }
   async canActivate(context: ExecutionContext): Promise<boolean> {
  const can = (await super.canActivate(context)) as boolean;
  if (!can) return false;

  const req = context.switchToHttp().getRequest();
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    throw new UnauthorizedException('Token no proporcionado');
  }

  const isBlacklisted = await this.authService.isBlacklisted(token);
  if (isBlacklisted) {
    throw new UnauthorizedException('Token en lista negra o sesión cerrada');
  }

  return true;
}

handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
  if (err || !user) {
    throw err || new UnauthorizedException('Token inválido');
  }
  return user;
}

}
