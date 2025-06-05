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
  Put,
  Query,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ReplaceUserDto } from './dto/replace-user.dto';
import { CurrentUser } from '../auth/decorators/current-user-decorator';
import { User } from './entities/user.entity';
import { UsersView } from './entities/users-view.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { formatResponse } from '../common/utils/response-format';
import { Filters } from '../common/interfaces/filters.interface'

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
@ApiOperation({
  summary: 'Buscar usuarios con filtros combinados',
  description: 'Permite buscar usuarios por email, estado activo y fechas de creación/actualización',
})
@ApiQuery({ name: 'email', required: false, description: 'Filtrar por email (búsqueda parcial)', example: 'ejemplo@correo.com' })
@ApiQuery({ name: 'dateType', required: false, enum: ['created_at', 'updated_at', 'deleted_at'] })
@ApiQuery({ name: 'startDate', required: false })
@ApiQuery({ name: 'endDate', required: false })
@ApiQuery({ name: 'isActive', required: false, description: 'Filtrar por estado activo (true/false)', example: true })
@ApiResponse({ status: 200, description: 'Lista de usuarios encontrados', type: [UsersView] })
async findAllWithFilters(
  @Query('email') email?: string,
  @Query('dateType') dateType?: 'created_at' | 'updated_at' | 'deleted_at',
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
  @Query('isActive') isActive?: string,
  @CurrentUser() user?: any,
) {
  if (!user) {
    throw new UnauthorizedException('Token inválido o no proporcionado');
  }

  let dateFilter: Filters['dateFilter'] = undefined;

  // Validaciones para filtro de fechas único
  if ((dateType || startDate || endDate) && !(dateType && startDate && endDate)) {
    throw new BadRequestException('Debe proporcionar dateType, startDate y endDate para filtrar por fecha');
  }

  if (dateType && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new BadRequestException('La fecha de inicio no puede ser mayor que la fecha final');
    }

    dateFilter = { dateType, startDate, endDate };
  }

  // Convertir isActive string a boolean o undefined
  const isActiveLower = isActive?.toLowerCase();
  const isActiveBoolean =
    isActiveLower === 'true' ? true :
    isActiveLower === 'false' ? false :
    undefined;

  const filters: Filters = {
    email,
    is_active: isActiveBoolean,
    dateFilter,
  };

  const records = await this.userService.findAllWithFilters(filters);

  return records.map(user => ({
  user_id: user.user_id,
  email: user.email,
  is_active: user.is_active,
  activation_token: user.activation_token,
  activated_at: user.activated_at,
  deleted_at: user.deleted_at,
}));

}

 @Get(':id')
@ApiOkResponse({ description: 'Usuario obtenido correctamente' })
@ApiUnauthorizedResponse({ description: 'No autorizado: token faltante o inválido' })
@ApiForbiddenResponse({ description: 'Acceso denegado' })
async findOne(@Param('id') id: string) {
  const user = await this.userService.findOne(+id);
  return user; 
}



  @Put(':id')
  @ApiOkResponse({ description: 'Usuario reemplazado completamente (PUT)' })
  @ApiUnauthorizedResponse({ description: 'No autorizado: token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Acceso denegado' })
  replaceUser(
    @Param('id') id: string,
    @Body() replaceUserDto: ReplaceUserDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.userService.replace(+id, replaceUserDto, user.user_id, ip);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Usuario actualizado parcialmente (PATCH)' })
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
