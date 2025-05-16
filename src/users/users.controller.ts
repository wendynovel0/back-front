import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { UserService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../auth/decorators/current-user-decorator';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiCreatedResponse({ type: User, description: 'Usuario creado exitosamente' })
  @ApiUnauthorizedResponse({ description: 'No autorizado: token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Acceso denegado' })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.userService.createWithAudit(createUserDto, user.user_id, ip);
  }

  @Get()
  @ApiOkResponse({ type: [User], description: 'Lista de usuarios obtenida' })
  @ApiUnauthorizedResponse({ description: 'No autorizado: token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Acceso denegado' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: User, description: 'Usuario obtenido correctamente' })
  @ApiUnauthorizedResponse({ description: 'No autorizado: token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Acceso denegado' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Usuario actualizado correctamente' })
  @ApiUnauthorizedResponse({ description: 'No autorizado: token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Acceso denegado' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.userService.update(+id, updateUserDto, user.user_id, ip);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Usuario eliminado correctamente' })
  @ApiUnauthorizedResponse({ description: 'No autorizado: token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Acceso denegado' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.userService.remove(+id, user.user_id, ip);
  }
}
