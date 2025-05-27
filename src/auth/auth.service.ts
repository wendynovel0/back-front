import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UserService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password_hash'>> {
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

      const newUser = await this.usersService.create({
        email: normalizedEmail,
        password_hash: hashedPassword,
        is_active: true,
      });

      const { password_hash, ...result } = newUser;
      return result;
    } catch (error) {
      console.error('Error en registro:', error);
      throw new InternalServerErrorException('Error al crear el usuario');
    }
  }

  async login(loginDto: LoginDto): Promise<{
  expires_in: number;
  login_token: string;
  name: string;
  success: boolean;
}> {
  try {
    const normalizedEmail = loginDto.email.toLowerCase().trim();
    const user = await this.validateUser(normalizedEmail, loginDto.password);

    const payload = {
      sub: user.user_id,
      email: user.email,
      is_active: user.is_active,
    };

    const token = this.jwtService.sign(payload, { expiresIn: '1h' }); // 3600 segundos

    return {
      expires_in: 3600, // o 1000 si así lo prefieres
      login_token: token,
      name: user.email ?? user.email, // asegúrate que user tenga esta propiedad
      success: true,
    };
  } catch (error) {
    console.error('Error en login:', error);

    if (error instanceof UnauthorizedException) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    throw new InternalServerErrorException('Error al iniciar sesión');
  }
}

  

  private async validateUser(email: string, password: string): Promise<User> {
  console.log('[validateUser] email:', email);
  console.log('[validateUser] password:', password);

  if (!email || !password) {
    throw new UnauthorizedException('Se requieren email y contraseña');
  }

  const user = await this.usersService.findByEmailWithPassword(email);
  console.log('[validateUser] user found:', user);

  if (!user) {
    throw new UnauthorizedException('Credenciales inválidas');
  }

  if (!user.is_active) {
    throw new UnauthorizedException('La cuenta está desactivada');
  }

  console.log('[validateUser] hash:', user.password_hash);

  const isValidPassword = await this.comparePasswords(password, user.password_hash);
  console.log('[validateUser] isValidPassword:', isValidPassword);

  if (!isValidPassword) {
    throw new UnauthorizedException('Credenciales inválidas');
  }

  return user;
}


  private async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error('Error al hashear contraseña:', error);
      throw new InternalServerErrorException('Error al procesar la contraseña');
    }
  }

  private async comparePasswords(plainTextPassword: string, hash: string): Promise<boolean> {
    if (!plainTextPassword || !hash) return false;

    try {
      if (!this.isValidBcryptHash(hash)) {
        return plainTextPassword === hash;
      }

      return await bcrypt.compare(plainTextPassword, hash);
    } catch (error) {
      console.error('Error comparando contraseñas:', error);
      return false;
    }
  }

  private isValidBcryptHash(hash: string): boolean {
    return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
  }

  async fullDiagnostic(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Auth] Starting diagnostic for: ${normalizedEmail}`);

    const user = await this.usersService.findByEmailWithPassword(normalizedEmail);
    console.log(`[Auth] User found:`, user ? 'Yes' : 'No');

    if (!user) {
      return {
        success: false,
        reason: 'USER_NOT_FOUND',
        details: `No user found with email: ${normalizedEmail}`,
      };
    }

    console.log(`[Auth] Account active:`, user.is_active);
    if (!user.is_active) {
      return {
        success: false,
        reason: 'ACCOUNT_INACTIVE',
        details: 'User account is not active',
      };
    }

    const hashAnalysis = {
      length: user.password_hash?.length,
      isBcrypt: this.isValidBcryptHash(user.password_hash),
      prefix: user.password_hash?.substring(0, 4),
    };
    console.log(`[Auth] Hash analysis:`, hashAnalysis);

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.password_hash);
      console.log(`[Auth] Password match:`, passwordMatch);
    } catch (compareError) {
      console.error(`[Auth] Compare error:`, compareError);
      return {
        success: false,
        reason: 'COMPARE_ERROR',
        details: 'Error comparing passwords',
        error: compareError.message,
      };
    }

    return {
      success: passwordMatch,
      reason: passwordMatch ? 'SUCCESS' : 'PASSWORD_MISMATCH',
      details: passwordMatch ? 'Authentication successful' : 'Password does not match',
      user: {
        email: user.email,
        is_active: user.is_active,
        created_at: user.created_at,
      },
      hashAnalysis,
    };
  }
}
