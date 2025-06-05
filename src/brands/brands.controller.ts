import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Patch,
  Query,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateBrandDto } from './dto/create-brand.dto';
import { BrandService } from './brand.service'; // Nombre corregido
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BadRequestException } from '@nestjs/common/exceptions/bad-request.exception';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Brand } from './entities/brand.entity';
import { CurrentUser } from '../auth/decorators/current-user-decorator';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrandView } from './entities/brands-view.entity';
import { BrandResponseDto } from './dto/response-brand';

@ApiTags('Brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandService) {} // Nombre corregido

@Get()
@ApiOperation({ summary: 'Obtener marcas con filtros' })
@ApiQuery({ name: 'search', required: false, type: String, description: 'Texto a buscar en nombre, descripción o proveedor' })
@ApiQuery({ name: 'supplierIds', required: false, type: String, description: 'IDs de proveedores separados por coma (ej: 1,2,3)' })
@ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Estado activo de la marca (true o false)' })
@ApiQuery({ name: 'dateType', required: false, enum: ['created_at', 'updated_at', 'deleted_at'], description: 'Tipo de fecha a filtrar' })
@ApiQuery({ name: 'startDate', required: false, type: String, description: 'Fecha inicial (YYYY-MM-DD)' })
@ApiQuery({ name: 'endDate', required: false, type: String, description: 'Fecha final (YYYY-MM-DD)' })
@ApiResponse({
  status: 200,
  description: 'Lista filtrada de marcas',
  type: [BrandResponseDto],
})
@ApiResponse({ status: 401, description: 'Token inválido o no proporcionado' })
async findAll(
  @Query('search') search?: string,
  @Query('supplierIds') supplierIdsRaw?: string,
  @Query('isActive') isActive?: boolean,
  @Query('dateType') dateType?: 'created_at' | 'updated_at' | 'deleted_at',
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
  @CurrentUser() user?: User,
): Promise<BrandResponseDto[]> {
  if (!user) {
    throw new UnauthorizedException('Token inválido o usuario no autenticado');
  }

  const supplierIds = supplierIdsRaw?.split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id)) || [];

  const dateFilter =
    dateType && startDate && endDate
      ? { dateType, startDate, endDate }
      : undefined;

  return this.brandsService.findAllWithFilters({
    search,
    isActive,
    supplierIds,
    dateFilter,
  });
}

  // @Get('search')
  // @ApiOperation({ summary: 'Buscar marcas de TI con filtros avanzados' })
  // @ApiQuery({ name: 'name', required: false, type: String, description: 'Filtrar por nombre (texto parcial)' })
  // @ApiQuery({ name: 'createdStartDate', required: false, type: String, description: 'Fecha inicio creación (YYYY-MM-DD)' })
  // @ApiQuery({ name: 'createdEndDate', required: false, type: String, description: 'Fecha fin creación (YYYY-MM-DD)' })
  // @ApiQuery({ name: 'updatedStartDate', required: false, type: String, description: 'Fecha inicio actualización (YYYY-MM-DD)' })
  // @ApiQuery({ name: 'updatedEndDate', required: false, type: String, description: 'Fecha fin actualización (YYYY-MM-DD)' })
  // @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Estado activo/inactivo' })
  // @ApiResponse({ status: 200, description: 'Lista filtrada de marcas de TI', type: [Brand] })
  // @ApiResponse({ status: 401, description: 'Token inválido o no proporcionado' })
  // async search(
  //   @Query('name') name?: string,
  //   @Query('createdStartDate') createdStartDate?: string,
  //   @Query('createdEndDate') createdEndDate?: string,
  //   @Query('updatedStartDate') updatedStartDate?: string,
  //   @Query('updatedEndDate') updatedEndDate?: string,
  //   @Query('isActive') isActive?: string,
  //   @CurrentUser() user: User,
  // ) {
  //   if (!user) {
  //     throw new UnauthorizedException('Token inválido o usuario no autenticado');
  //   }

  //   const parsedIsActive =
  //     isActive === 'true' ? true : isActive === 'false' ? false : undefined;

  //   const filters = {
  //     name,
  //     createdStartDate,
  //     createdEndDate,
  //     updatedStartDate,
  //     updatedEndDate,
  //     isActive: parsedIsActive,
  //   };

  //   return this.brandsService.findAllWithFilters(filters);
  // }

  @Get(':id')
@ApiOperation({ summary: 'Obtener una marca de TI por ID' })
@ApiParam({
  name: 'id',
  type: Number,
  description: 'ID de la marca',
  example: 1,
})
@ApiResponse({
  status: 200,
  description: 'Marca de TI encontrada',
  schema: {
    example: {
      id: 1,
      name: 'Microsoft',
      description: 'Empresa líder en software y servicios en la nube',
      isActive: 'Sí'
    }
  }
})
@ApiResponse({ status: 400, description: 'ID inválido' })
@ApiResponse({ status: 401, description: 'Token inválido o no proporcionado' })
@ApiResponse({ status: 404, description: 'Marca no encontrada' })
async findOne(@Param('id') id: string) {

  if (isNaN(+id)) {
    throw new BadRequestException('ID inválido');
  }

  const brand = await this.brandsService.findOneMinimal(+id);
  
  if (!brand) {
    throw new NotFoundException('Marca no encontrada');
  }

  return {
    id: brand.id,
    name: brand.name,
    description: brand.description,
    isActive: brand.isActive ? 'Sí' : 'No'
  };
}


  @Post()
  @ApiOperation({ summary: 'Crear nueva marca de TI' })
  @ApiResponse({
    status: 201,
    description: 'Marca de TI creada',
    type: Brand,
    examples: {
      'Marca creada': {
        summary: 'Ejemplo de marca creada exitosamente',
        value: {
          brandId: 4,
          name: 'NVIDIA',
          description: 'Fabricante líder de GPUs y tecnología gráfica',
          isActive: true,
          createdAt: '2023-07-01',
          updatedAt: '2023-07-01',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
    examples: {
      'Nombre faltante': {
        summary: 'Error de validación',
        value: {
          statusCode: 400,
          message: ['name should not be empty'],
          error: 'Bad Request',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido o no proporcionado' })
  @ApiResponse({
    status: 409,
    description: 'El nombre de la marca ya existe',
    examples: {
      'Conflicto de nombre': {
        summary: 'Marca ya existente',
        value: {
          statusCode: 409,
          message: 'El nombre de la marca ya existe',
          error: 'Conflict',
        },
      },
    },
  })
  async create(@Body() createBrandDto: CreateBrandDto, @CurrentUser() user: User) {
    if (!user) {
      throw new UnauthorizedException('Token inválido o usuario no autenticado');
    }
    return this.brandsService.create(createBrandDto, user.user_id);
  }

 @Put(':id')
@ApiOperation({ summary: 'Actualizar marca de TI completamente' })
@ApiParam({
  name: 'id',
  type: Number,
  description: 'ID de la marca a actualizar',
  example: 1,
})
@ApiResponse({
  status: 200,
  description: 'Marca actualizada exitosamente',
  schema: {
    example: { message: 'Marca actualizada exitosamente' },
  },
})
@ApiResponse({ status: 401, description: 'Token inválido o no proporcionado' })
@ApiResponse({ status: 404, description: 'Marca no encontrada' })
@ApiResponse({ status: 409, description: 'El nombre de la marca ya existe' })
async update(
  @Param('id') id: string,
  @Body() updateBrandDto: UpdateBrandDto,
  @CurrentUser() user: User,
) {
  if (!user) {
    throw new UnauthorizedException('Token inválido o usuario no autenticado');
  }

  await this.brandsService.update(+id, updateBrandDto, user.user_id);
  return { message: 'Marca actualizada exitosamente' };
}

@Delete(':id')
@ApiOperation({ summary: 'Desactivar marca de TI (eliminación lógica)' })
@ApiParam({
  name: 'id',
  type: Number,
  description: 'ID de la marca a desactivar',
  example: 2,
})
@ApiResponse({
  status: 200,
  description: 'Marca eliminada exitosamente',
  schema: {
    example: { message: 'Marca eliminada exitosamente' },
  },
})
@ApiResponse({ status: 401, description: 'Token inválido o no proporcionado' })
@ApiResponse({ status: 404, description: 'Marca no encontrada' })
async remove(@Param('id') id: string, @CurrentUser() user: User) {
  if (!user) {
    throw new UnauthorizedException('Token inválido o usuario no autenticado');
  }

  await this.brandsService.remove(+id, user.user_id);
  return { message: 'Marca eliminada exitosamente' };
}

  @Patch(':id/activate')
@ApiOperation({ summary: 'Reactivar marca de TI' })
@ApiParam({
  name: 'id',
  type: Number,
  description: 'ID de la marca a reactivar',
  example: 3,
})
@ApiResponse({
  status: 200,
  description: 'Marca reactivada exitosamente',
  schema: {
    example: { message: 'Marca reactivada exitosamente' },
  },
})
@ApiResponse({ status: 401, description: 'Token inválido o no proporcionado' })
@ApiResponse({ status: 404, description: 'Marca no encontrada' })
async activate(@Param('id') id: string, @CurrentUser() user: User) {
  if (!user) {
    throw new UnauthorizedException('Token inválido o usuario no autenticado');
  }

  await this.brandsService.activate(+id, user.user_id);
  return { message: 'Marca reactivada exitosamente' };
}
}
