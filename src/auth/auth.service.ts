import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { ConfigService } from '@nestjs/config';
import { forwardRef, Inject } from '@nestjs/common';
import { UserService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS: number = 12;

  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(BlacklistedToken)
    private readonly blacklistedTokenRepo: Repository<BlacklistedToken>,
  ) {}

  async logout(token: string): Promise<{ message: string }> {
    const decoded = this.jwtService.decode(token) as { exp?: number };
    if (!decoded?.exp) {
      throw new UnauthorizedException('Token inválido');
    }

    const expiresAt = new Date(decoded.exp * 1000);
    await this.blacklistedTokenRepo.save({ token, expiresAt });

    return { message: 'Sesión cerrada correctamente' };
  }

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password_hash'>> {
    const { email, password } = registerDto;

    if (!email || !password) {
      throw new UnauthorizedException('Email y contraseña son requeridos');
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
      throw new InternalServerErrorException('Error al registrar el usuario');
    }
  }


async login(loginDto: LoginDto) {
  const user = await this.validateUser(loginDto.email, loginDto.password);

  if (!user) {
    throw new UnauthorizedException('Credenciales inválidas');
  }
  const payload: JwtPayload = {
    sub: user.user_id,
    email: user.email,
    is_active: user.is_active,
    ...(user.username && { username: user.username }) 
  };

  const token = this.jwtService.sign(payload);

  return {
    expires_in: 3600,
    access_token: token,
    email: user.email,
    user_id: user.user_id
  };
}

  async validateUser(email: string, password: string): Promise<User> {
    if (!email || !password) {
      throw new UnauthorizedException('Email y contraseña son requeridos');
    }

    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Cuenta desactivada');
    }

    const isValidPassword = await this.comparePasswords(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  private async comparePasswords(
    plainTextPassword: string,
    hash: string
  ): Promise<boolean> {
    if (!plainTextPassword || !hash) return false;

    if (!this.isValidBcryptHash(hash)) {
      return plainTextPassword === hash;
    }

    return bcrypt.compare(plainTextPassword, hash);
  }

  private isValidBcryptHash(hash: string): boolean {
    return /^\$2[aby]\$/.test(hash);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const entry = await this.blacklistedTokenRepo.findOne({ where: { token } });
    return !!entry;
  }

  // Método para diagnóstico (opcional)
  async diagnostic(email: string): Promise<{ exists: boolean; isActive?: boolean }> {
    const user = await this.usersService.findByEmail(email);
    return {
      exists: !!user,
      isActive: user?.is_active
    };
  }
}