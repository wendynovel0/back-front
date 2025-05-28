import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const can = (await super.canActivate(context)) as boolean;
    if (!can) return false;

    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Token no proporcionado o mal formado');
      throw new UnauthorizedException('Token no proporcionado o mal formado');
    }

    const token = authHeader.replace('Bearer ', '').trim();

    this.logger.debug('Token recibido: ' + token);

    const isBlacklisted = await this.authService.isBlacklisted(token);

    if (isBlacklisted) {
      this.logger.warn('Token está en blacklist');
      throw new UnauthorizedException('Token inválido o cerrado sesión');
    }

    return true;
  }
}
