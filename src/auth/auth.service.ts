import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Inject,
  forwardRef,
  ForbiddenException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { UserService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { MailService } from '../mail/mail.service';
import { normalizeToken } from '../common/utils/token.utils';

import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { formatResponse } from 'src/common/utils/response-format';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @InjectRepository(BlacklistedToken)
    private readonly blacklistedTokenRepo: Repository<BlacklistedToken>,
  ) {}


  async register(registerDto: RegisterDto): Promise<any> {
  const { email, password } = registerDto;

  if (!email || !password) {
    throw new UnauthorizedException('Se requieren email y contraseña');
  }

  if (password.length < 8) {
    throw new UnauthorizedException('La contraseña debe tener al menos 8 caracteres');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await this.usersService.findByEmail(normalizedEmail);
  if (existingUser) {
    throw new ConflictException('El email ya está registrado');
  }

  try {
    const hashedPassword = await this.hashPassword(password);

    const activationToken = crypto.randomUUID(); // o usa un generador seguro

    await this.usersService.create({
      email: normalizedEmail,
      password_hash: hashedPassword,
      is_active: false,
      activation_token: activationToken,
    });

    await this.mailService.sendConfirmationEmail(normalizedEmail, activationToken);

    return {
      success: true,
      message: 'Usuario registrado. Por favor revisa tu correo para confirmar tu cuenta.',
    };
  } catch (error) {
    console.error('Error en registro:', error);
    throw new InternalServerErrorException('Error al crear el usuario');
  }
}


  async login(loginDto: LoginDto): Promise<any> {
    try {
      const normalizedEmail = loginDto.email.toLowerCase().trim();
      const user = await this.validateUser(normalizedEmail, loginDto.password);

      const payload = {
        sub: user.user_id,
        email: user.email,
        is_active: user.is_active,
      };

      const token = this.jwtService.sign(payload);

      return formatResponse([{
        access_token: token,
          userId: user.user_id,
          email: user.email
        }]);
    } catch (error) {
      console.error('Error en login:', error);
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
  }

  

async logout(token: string): Promise<any> {
  const normalizedToken = normalizeToken(token);

  console.log('[logout] Token normalizado:', normalizedToken);

  const decoded: any = this.jwtService.decode(normalizedToken);
  if (!decoded || !decoded.sub) {
    throw new UnauthorizedException('Token inválido');
  }

  const user = await this.usersService.findOne(decoded.sub);
  if (!user) {
    throw new UnauthorizedException('Usuario no encontrado');
  }

  const expiresAt = new Date(decoded.exp * 1000);

  await this.blacklistedTokenRepo.save({
    token: normalizedToken,
    expiresAt,
    user,
  });

  console.log('[logout] Token length:', token.length);
  console.log('[logout] Token saved:', `"${token}"`);

  console.log('[logout] Token guardado en blacklist');
  console.log('[logout] SHA:', require('crypto').createHash('sha256').update(normalizedToken).digest('hex'));

  return { message: 'Sesión cerrada correctamente' };
  
}
  async isBlacklisted(token: string): Promise<boolean> {
  const cleanedToken = normalizeToken(token);

  if (!cleanedToken) {
    console.warn('[isBlacklisted] Token vacío después de limpiar. Se considera inválido.');
    return true;
  }

  console.log('[isBlacklisted] Buscando token exacto:', cleanedToken);
  console.log('[blacklist] SHA:', require('crypto').createHash('sha256').update(cleanedToken).digest('hex'));

  // Primer intento: usando findOne con where
  const entry = await this.blacklistedTokenRepo.findOne({
    where: { token: cleanedToken },
  });

  if (entry) {
    console.log('[isBlacklisted] Entrada encontrada en blacklist:', entry);
    return true;
  } else {
    console.log('[isBlacklisted] No encontrado con findOne. Ejecutando query raw para verificar...');

    // Segundo intento: usar query builder para depurar
    const result = await this.blacklistedTokenRepo
      .createQueryBuilder('bt')
      .where('bt.token = :token', { token: cleanedToken })
      .getRawAndEntities();

    if (result.raw.length > 0) {
      console.warn('[isBlacklisted] ⚠️ Token sí está en la base, pero no lo encuentra con findOne.');
      console.log('[isBlacklisted] Raw data:', result.raw);
      return true;
    }

    console.log('[isBlacklisted] Token NO está en blacklist.');
    return false;
  }
}

async confirmAccount(token: string): Promise<{ message: string }> {
  await this.usersService.activateUserByToken(token);   
  return { message: 'Cuenta activada exitosamente' };
}

  private async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmailWithPassword(email);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.is_active) {
      throw new ForbiddenException('La cuenta no está activada. Por favor verifica tu email.');
    }

    const isValidPassword = await this.comparePasswords(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

 private normalizeToken(token: string): string {
    return token.replace(/^Bearer\s+/i, '').trim();
  }
  
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  }

  private async comparePasswords(plainTextPassword: string, hash: string): Promise<boolean> {
    if (!plainTextPassword || !hash) return false;
    return bcrypt.compare(plainTextPassword, hash);
  }


  private isValidBcryptHash(hash: string): boolean {
    return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
  }
}
