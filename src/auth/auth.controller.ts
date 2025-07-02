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
import Pushpad from 'pushpad';



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
async attachFcm(@Body('userId') userId: number, @Body('uid') uid: string) {
  if (!userId || !uid) throw new BadRequestException();

  const user = await this.userService.findOne(userId);
  if (!user) throw new NotFoundException();

  const pushpadClient = new Pushpad({
    authToken: process.env.PUSHPAD_AUTH_TOKEN,
    projectId: Number(process.env.PUSHPAD_PROJECT_ID),
  });

  const novu = new Novu(this.configService.get('NOVU_SECRET_KEY'));

  await novu.subscribers.identify(userId.toString(), { email: user.email });

  await novu.subscribers.setCredentials(
    userId.toString(),
    PushProviderIdEnum.Pushpad,
    { deviceTokens: [uid] }
  );

  await novu.trigger('usuario-activo', {
    to: { subscriberId: userId.toString() },
    payload: { mensaje: 'Canal Pushpad activo ✨' },
  });

  return { success: true };
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
