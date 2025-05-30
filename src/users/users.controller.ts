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
@ApiQuery({ name: 'createdStartDate', required: false, description: 'Fecha inicial de creación (YYYY-MM-DD)', example: '2023-01-01' })
@ApiQuery({ name: 'createdEndDate', required: false, description: 'Fecha final de creación (YYYY-MM-DD)', example: '2023-12-31' })
@ApiQuery({ name: 'updatedStartDate', required: false, description: 'Fecha inicial de actualización (YYYY-MM-DD)', example: '2023-01-01' })
@ApiQuery({ name: 'updatedEndDate', required: false, description: 'Fecha final de actualización (YYYY-MM-DD)', example: '2023-12-31' })
@ApiQuery({ name: 'isActive', required: false, description: 'Filtrar por estado activo (true/false)', example: true })
@ApiResponse({ status: 200, description: 'Lista de usuarios encontrados', type: [UsersView] })
async findAllWithFilters(
  @Query('email') email: string,
  @Query('createdStartDate') createdStartDate: string,
  @Query('createdEndDate') createdEndDate: string,
  @Query('updatedStartDate') updatedStartDate: string,
  @Query('updatedEndDate') updatedEndDate: string,
  @Query('deletedStartDate') deletedStartDate: string,
  @Query('deletedEndDate') deletedEndDate: string,
  @Query('isActive') isActive: string,
  @CurrentUser() user: any
) {
  if (!user) {
    throw new UnauthorizedException('Token inválido o no proporcionado');
  }

  let dateFilter: Filters['dateFilter'] = undefined;

  const filterSets = [
    { type: 'created_at', start: createdStartDate, end: createdEndDate },
    { type: 'updated_at', start: updatedStartDate, end: updatedEndDate },
    { type: 'deleted_at', start: deletedStartDate, end: deletedEndDate },
  ];

  const usedFilters = filterSets.filter(f => f.start || f.end);

  if (usedFilters.length > 1) {
    throw new BadRequestException('Solo puede aplicar un tipo de filtro de fecha a la vez');
  }

  const activeFilter = usedFilters[0];
  if (activeFilter) {
    if (!activeFilter.start || !activeFilter.end) {
      throw new BadRequestException(`Debe proporcionar ambas fechas para ${activeFilter.type}`);
    }

    const start = new Date(activeFilter.start);
    const end = new Date(activeFilter.end);
    if (start > end) {
      throw new BadRequestException(`${activeFilter.type} startDate no puede ser mayor que endDate`);
    }

    dateFilter = {
      dateType: activeFilter.type as 'created_at' | 'updated_at' | 'deleted_at',
      startDate: activeFilter.start,
      endDate: activeFilter.end,
    };
  }

  const isActiveLower = isActive?.toLowerCase();
  const isActiveBoolean =
    isActiveLower === 'true' ? true : isActiveLower === 'false' ? false : undefined;

  const filters: Filters = {
    email,
    is_active: isActiveBoolean,
    dateFilter,
  };

  const records = await this.userService.findAllWithFilters(filters);

  const filteredRecords = records.map(user => ({
    user_id: user.user_id,
    email: user.email,
    is_active: user.is_active,
  }));

  return filteredRecords;
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
