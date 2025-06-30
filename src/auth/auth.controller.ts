import {
  Controller,
  Post,
  Body,
  Get,
  HttpStatus,
  HttpCode,
  Req,
  UseGuards,
  UnauthorizedException,
  Param,
  BadRequestException,
  Res,
  Inject,
  Redirect,
  Query,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam
} from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { formatResponse } from '../common/utils/response-format';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { RecaptchaGuard } from 'src/recaptcha/recaptcha.guard';
import { join } from 'path';
import { Novu, PushProviderIdEnum } from '@novu/node';



@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}


  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    await this.authService.logout(token);
    return { message: 'Sesión cerrada correctamente' };
  }

  @Post('fcm')
async attachFcmTokenToUser(
  @Body('userId') userId: number,
  @Body('fcmToken') fcmToken: string,
) {
  // Validaciones iniciales
  if (!userId || !fcmToken) {
    throw new BadRequestException('userId y fcmToken son obligatorios');
  }

  const user = await this.userService.findOne(userId);
  if (!user) {
    throw new NotFoundException('Usuario no encontrado');
  }

  const novu = new Novu(this.configService.get('NOVU_SECRET_KEY'));
  const subscriberId = userId.toString();

  try {
    // 1. Identificar/crear el suscriptor en Novu
    await novu.subscribers.identify(subscriberId, {
      email: user.email,
    });

    console.log('Registrando FCM Token:', {
      subscriberId,
      fcmToken: fcmToken.substring(0, 5) + '...' + fcmToken.slice(-5), // Muestra inicio y fin del token
    });

    // 2. Registrar credenciales FCM
    await novu.subscribers.setCredentials(
      subscriberId,
      'fcm', // Usamos string directamente por compatibilidad
      {
        deviceTokens: [fcmToken],
      },
      'firebase-cloud-messaging' // Debe coincidir con el ID de tu integración en Novu
    );

    // 3. Disparar notificación de prueba
    console.log('Enviando trigger a:', subscriberId);
    await novu.trigger('usuario-activo', {
      to: { subscriberId },
      payload: {
        nombre: user.email,
        mensaje: '¡Bienvenido/a!',
      },
    });

    return {
      success: true,
      message: 'Token FCM registrado y notificación enviada',
      debug: {
        subscriberId,
        email: user.email,
        tokenPreview: fcmToken.substring(0, 5) + '...' + fcmToken.slice(-5),
      }
    };

  } catch (error) {
    console.error('Error en flujo FCM:', {
      error: error.response?.data || error.message,
      userId,
      subscriberId,
    });

    throw new InternalServerErrorException({
      success: false,
      message: 'Error al procesar el token FCM',
      technicalDetails: {
        error: error.message,
        step: error.config?.url?.includes('subscribers') ? 'registro' : 'notificación'
      }
    });
  }
}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario (envía correo de confirmación)' }) 
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        user_id: 1,
        username: 'nuevousuario',
        email: 'usuario@ejemplo.com',
        is_active: true,
        created_at: '2023-08-01T12:00:00Z',
        updated_at: '2023-08-01T12:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error en la validación de datos',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El email ya está registrado',
  })
  async register(@Body() registerDto: RegisterDto) {
  return this.authService.register(registerDto); 
}

  @Get('confirm-email')
async confirmEmail(@Query('token') token: string) {
  if (!token) {
    throw new BadRequestException('Token no proporcionado');
  }

  try {
    const result = await this.authService.confirmEmail(token);

    if (result === 'alreadyConfirmed') {
      return { status: 'alreadyConfirmed' };
    }

    if (result === 'confirmed') {
      return { status: 'confirmed' };
    }

    return { status: 'error' };
  } catch (error) {
    console.error('confirmEmail error:', error);
    throw new InternalServerErrorException('Error al confirmar el correo');
  }
}



  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RecaptchaGuard)
  @ApiOperation({ summary: 'Autenticación de usuario' })
  @ApiBody({
    type: LoginDto,
    examples: { 
      example1: {
        summary: 'Ejemplo de login',
        value: {
          email: 'usuario@ejemplo.com',
          password: 'PasswordSeguro123!',
        },
      },
    },
  })
  @ApiResponse({
  status: HttpStatus.OK,
  schema: {
    example: {
      expires_in: 3600,
      login_token: 'tokenEjemplo',
    },
  },
})
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Credenciales inválidas',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cuenta desactivada',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
