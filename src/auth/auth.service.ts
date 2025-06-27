import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Inject,
  forwardRef,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { NovuService } from '../notifications/novu.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { UserService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { MailService } from '../mail/mail.service';
import { normalizeToken } from '../common/utils/token.utils';
import * as crypto from 'crypto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { formatResponse } from 'src/common/utils/response-format';
import { ActionLogsService } from 'src/action-logs/action-logs.service';
import { ConfigService } from '@nestjs/config';
import { RecaptchaService } from 'src/recaptcha/recaptcha.service';
import { Logger } from '@nestjs/common';
import { Novu } from '@novu/node';


@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly logger = new Logger(AuthService.name);


  constructor(
  @Inject(forwardRef(() => UserService))
  private readonly usersService: UserService,
  private readonly jwtService: JwtService,
  private readonly mailService: MailService,
  @InjectRepository(BlacklistedToken)
  private readonly blacklistedTokenRepo: Repository<BlacklistedToken>,
  @Inject(forwardRef(() => ActionLogsService))
  private readonly actionLogsService: ActionLogsService,
  private readonly configService: ConfigService, 
  private readonly recaptchaService: RecaptchaService, 
  private readonly novuService: NovuService

) {}
  

 async register(registerDto: RegisterDto): Promise<any> {
  const { email, password, recaptchaToken } = registerDto;

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

    const activationToken = this.jwtService.sign(
      { email: normalizedEmail },
      {
        secret: this.configService.get('JWT_ACTIVATION_SECRET'),
        expiresIn: '24h',
      },
    );

    const newUser = await this.usersService.create({
      email: normalizedEmail,
      password_hash: hashedPassword,
      is_active: false,
      activation_token: activationToken,
    });

    // 👇 NOVU: Crear suscriptor en Novu
    try {
      const novuSecretKey = this.configService.get<string>('NOVU_SECRET_KEY');
      if (!novuSecretKey) {
        throw new Error('NOVU_SECRET_KEY no está definido en las variables de entorno');
      }

      const novu = new Novu(novuSecretKey);

      await novu.subscribers.identify(newUser.user_id.toString(), {
        email: newUser.email,
      });
    } catch (novuError) {
      console.warn('No se pudo registrar en Novu:', novuError.message);
    }

    // Justo antes de enviar el correo
    console.log('📤 Enviando correo de activación a:', normalizedEmail);
    await this.mailService.sendConfirmationEmail(normalizedEmail, activationToken);
    // Justo después del intento, si no lanza error
    console.log('✅ Correo de activación enviado correctamente');

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
  const { email, password, recaptchaToken } = loginDto;
  console.log('🔐 Login DTO recibido:', loginDto);

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.validateUser(normalizedEmail, password);

    const payload = {
      sub: user.user_id,
      email: user.email,
      is_active: user.is_active,
    };

    const token = this.jwtService.sign(payload);
    const expiresIn = 3600;

    // 🔔 NOVU: Disparar notificación "usuario-activo"
    try {
      const novu = new Novu(this.configService.get('NOVU_SECRET_KEY'));

      console.log('📣 Enviando trigger de notificación usuario-activo...');
      await novu.trigger('usuario-activo', {
        to: {
          subscriberId: user.user_id.toString(),
          email: user.email,
        },
        payload: {
          userId: user.user_id,
          email: user.email,
          timestamp: new Date().toISOString(),
        },
      });

      console.log('✅ Trigger enviado a Novu');
    } catch (novuError) {
      console.error(
        '❌ Error al enviar trigger a Novu:',
        novuError?.response?.data || novuError.message || novuError
      );
    }

    await this.actionLogsService.logAction({
      userId: user.user_id,
      actionType: 'SESSION_LOGIN',
      entityType: 'user',
      entityId: user.user_id,
    });

    return {
      expires_in: expiresIn,
      login_token: token,
      user_id: user.user_id,
    };
  } catch (error) {
    console.error('💥 Error en login:', error);

    await this.actionLogsService.logAction({
      userId: -1,
      actionType: 'SESSION_LOGIN_FAILED',
      entityType: 'user',
    });

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
    user: { user_id: user.user_id },
  });


  await this.actionLogsService.logAction({
    userId: decoded.sub,
    actionType: 'SESSION_LOGOUT',
    entityType: 'user',
    entityId: decoded.sub,
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

    const result = await this.blacklistedTokenRepo
      .createQueryBuilder('bt')
      .where('bt.token = :token', { token: cleanedToken })
      .getRawAndEntities();

    if (result.raw.length > 0) {
      console.warn('[isBlacklisted]  Token sí está en la base, pero no lo encuentra con findOne.');
      console.log('[isBlacklisted] Raw data:', result.raw);
      return true;
    }

    console.log('[isBlacklisted] Token NO está en blacklist.');
    return false;
  }
}


async confirmAccount(token: string): Promise<string> {
  try {
    const decoded = this.jwtService.verify(token, {
      secret: this.configService.get('JWT_ACTIVATION_SECRET'),
    });


    await this.usersService.activateUserByToken(token);
    return decoded.email;

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new BadRequestException('Token expirado');
    }
    throw new BadRequestException('Token inválido');
  }
  
}

async confirmEmail(token: string): Promise<'confirmed' | 'alreadyConfirmed' | 'error'> {
  try {
    const decoded = this.jwtService.verify(token, {
      secret: this.configService.get('JWT_ACTIVATION_SECRET'),
    });

    const user = await this.usersService.findByActivationToken(token);
    if (!user) {
      this.logger.warn(`Token no corresponde a ningún usuario: ${token}`);
      return 'error';
    }

    if (user.is_active) {
      this.logger.warn(`El usuario ${user.email} ya estaba activado`);
      return 'alreadyConfirmed';
    }

    this.logger.log(`Activando cuenta para: ${user.email}`);
    await this.usersService.update(
      user.user_id,
      {
        is_active: true,
        activation_token: null,
        activated_at: new Date(),
      },
      user.user_id
    );

    try {
      await this.mailService.sendActivationSuccessEmail(user.email);
    } catch (emailError) {
      this.logger.warn(`No se pudo enviar el correo de éxito a ${user.email}: ${emailError.message}`);
    }

    try {
      const novuSecretKey = this.configService.get<string>('NOVU_SECRET_KEY');
      if (!novuSecretKey) {
        throw new Error('NOVU_SECRET_KEY no está definido');
      }

      const novu = new Novu(novuSecretKey);
      await novu.trigger('usuario-activo', {
        to: {
          subscriberId: user.user_id.toString(),
        },
        payload: {
          email: user.email || '',
        },
      });

      this.logger.log(`Notificación push enviada a ${user.email}`);
    } catch (pushError) {
      this.logger.warn(`No se pudo enviar notificación push: ${pushError.message}`);
    }

    this.logger.log('Cuenta activada y correo enviado');
    return 'confirmed';
  } catch (err) {
    this.logger.error(`Error confirmando email: ${err.message}`, err.stack);
    return 'error';
  }
}


  private async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmailWithPassword(email);
    console.log('Usuario encontrado:', user);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.is_active) {
      throw new ForbiddenException('La cuenta no está activada. Por favor verifica tu email.');
    }

    const isValidPassword = await this.comparePasswords(password, user.password_hash);
    console.log('✅ ¿Contraseña coincide?:', isValidPassword);
    
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
  if (!plainTextPassword || !hash) {
    console.log('❌ Contraseña o hash no proporcionados');
    return false;
  }

  const result = await bcrypt.compare(plainTextPassword, hash);
  console.log('🔐 Resultado de bcrypt.compare:', result);
  return result;
}


  private isValidBcryptHash(hash: string): boolean {
    return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
  }
}
