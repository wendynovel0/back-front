import { Controller, Post, Body, HttpStatus, HttpCode, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
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
        updated_at: '2023-08-01T12:00:00Z'
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Error en la validación de datos' 
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: 'El email ya está registrado' 
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Autenticación de usuario' })
@ApiBody({ 
  type: LoginDto,
  examples: {
    example1: {
      summary: 'Ejemplo de login',
      value: {
        email: 'usuario@ejemplo.com',
        password: 'PasswordSeguro123!'
      }
    }
  }
})
@ApiResponse({
  status: HttpStatus.OK,
  schema: {
    example: {
      expires_in: 3600,
      login_token: 'tokenEjemplo',
      name: 'usuario@ejemplo.com',
      success: true,
    }
  }
})
@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Credenciales inválidas' })
@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Cuenta desactivada' })
async login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}
}
