import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Primero ejecuta la validación JWT de Passport
    const isValid = (await super.canActivate(context)) as boolean;
    if (!isValid) {
      return false;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Encabezado de autorización inválido');
    }

    const token = authHeader.split(' ')[1]?.trim();

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    // Consulta la blacklist
    const isBlacklisted = await this.authService.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token inválido o ha cerrado sesión');
    }

    return true;
  }
}
