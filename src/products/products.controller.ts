import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Product } from './entities/product.entity';
import { CurrentUser } from '../auth/decorators/current-user-decorator';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
@ApiOperation({ 
  summary: 'Buscar productos con filtros combinados',
  description: 'Permite buscar productos por múltiples criterios. Todos los parámetros son opcionales.'
})
@ApiQuery({ 
  name: 'search', 
  required: false, 
  description: 'Texto para buscar en código, nombre o descripción de producto o nombre de marca',
  example: 'iPhone'
})
@ApiQuery({ 
  name: 'startDate', 
  required: false, 
  description: 'Fecha inicial para filtrar por creación o edición (formato YYYY-MM-DD)',
  example: '2023-01-01'
})
@ApiQuery({ 
  name: 'endDate', 
  required: false, 
  description: 'Fecha final para filtrar por creación o edición (formato YYYY-MM-DD)',
  example: '2023-12-31'
})
@ApiQuery({ 
  name: 'isActive', 
  required: false, 
  description: 'Filtrar por estado activo (true) o inactivo (false)',
  example: true
})
@ApiQuery({ 
  name: 'brandIds', 
  required: false, 
  description: 'IDs de marcas separados por comas',
  example: '1,2,3'
})
@ApiResponse({
  status: 200,
  description: 'Lista de productos encontrados',
  type: [Product]
})
@ApiResponse({ 
  status: 401, 
  description: 'No autorizado - Token inválido o no proporcionado'
})
async findAll(
  @Query('search') search?: string,
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
  @Query('isActive') isActive?: string,
  @Query('brandIds') brandIds?: string,
  @CurrentUser() user?: User
) {
  if (!user) {
    throw new UnauthorizedException('Token inválido o no proporcionado');
  }

  // Validación básica de fechas
  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new BadRequestException('Debe proporcionar ambas fechas: startDate y endDate');
  }
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Fechas inválidas, formato esperado YYYY-MM-DD');
    }
    if (start > end) {
      throw new BadRequestException('startDate no puede ser mayor que endDate');
    }
    if (end > now) {
      throw new BadRequestException('endDate no puede ser una fecha futura');
    }
  }

  const brandIdsArray = brandIds ? brandIds.split(',').map(id => parseInt(id.trim())) : undefined;

  // Convertir isActive a boolean
  const isActiveBoolean = isActive === undefined
    ? undefined
    : isActive.toLowerCase() === 'true';

  return this.productsService.findAll({
    search,
    startDate,
    endDate,
    isActive: isActiveBoolean,
    brandIds: brandIdsArray
  });
}


  @Post()
  @ApiOperation({ 
    summary: 'Crear nuevo producto',
    description: 'Crea un nuevo producto en el sistema. El código debe ser único.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Producto creado exitosamente',
    type: Product,
    examples: {
      'Producto creado': {
        summary: 'Ejemplo de producto creado',
        value: {
          product_id: 4,
          code: "MBP-14",
          name: "MacBook Pro 14\"",
          description: "Laptop profesional con chip M1 Pro",
          price: 32999,
          brand_id: 1,
          is_active: true,
          created_at: "2023-07-10",
          updated_at: "2023-07-10",
          brand: {
            brand_id: 1,
            name: "Apple",
            description: "Empresa líder en tecnología",
            is_active: true,
            created_at: "2023-01-01",
            updated_at: "2023-01-01"
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos inválidos o marca no encontrada',
    examples: {
      'Datos faltantes': {
        summary: 'Error de validación',
        value: {
          statusCode: 400,
          message: [
            'code should not be empty',
            'name should not be empty',
            'price must be a positive number'
          ],
          error: 'Bad Request'
        }
      },
      'Marca no existe': {
        summary: 'Marca no encontrada',
        value: {
          statusCode: 400,
          message: 'La marca especificada no existe',
          error: 'Bad Request'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'No autorizado',
    examples: {
      'Token inválido': {
        summary: 'Error de autenticación',
        value: {
          statusCode: 401,
          message: 'Token inválido o no proporcionado',
          error: 'Unauthorized'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'El código de producto ya existe',
    examples: {
      'Código duplicado': {
        summary: 'Conflicto de código',
        value: {
          statusCode: 409,
          message: 'El código de producto ya existe',
          error: 'Conflict'
        }
      }
    }
  })
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User
  ) {
    if (!user) {
      throw new UnauthorizedException('Token inválido o no proporcionado');
    }
    return this.productsService.create(createProductDto, user);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Actualizar producto completamente',
    description: 'Reemplaza todos los campos del producto. Para actualización parcial use PATCH.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'ID del producto a actualizar',
    example: 1
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Producto actualizado exitosamente',
    type: Product,
    examples: {
      'Producto actualizado': {
        summary: 'Ejemplo de producto actualizado',
        value: {
          product_id: 1,
          code: "IP13-128-NEW",
          name: "iPhone 13 128GB (2023 Edition)",
          description: "Smartphone con chip A15 Bionic y nueva cámara",
          price: 18999,
          brand_id: 1,
          is_active: true,
          created_at: "2023-01-01",
          updated_at: "2023-07-15",
          brand: {
            brand_id: 1,
            name: "Apple",
            description: "Empresa líder en tecnología",
            is_active: true,
            created_at: "2023-01-01",
            updated_at: "2023-01-01"
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos inválidos',
    examples: {
      'Datos inválidos': {
        summary: 'Error de validación',
        value: {
          statusCode: 400,
          message: [
            'price must be a positive number'
          ],
          error: 'Bad Request'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'No autorizado',
    examples: {
      'Token inválido': {
        summary: 'Error de autenticación',
        value: {
          statusCode: 401,
          message: 'Token inválido o no proporcionado',
          error: 'Unauthorized'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Producto no encontrado',
    examples: {
      'Producto no existe': {
        summary: 'Producto no encontrado',
        value: {
          statusCode: 404,
          message: 'Producto no encontrado',
          error: 'Not Found'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'El código de producto ya existe',
    examples: {
      'Código duplicado': {
        summary: 'Conflicto de código',
        value: {
          statusCode: 409,
          message: 'El código de producto ya existe',
          error: 'Conflict'
        }
      }
    }
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: User
  ) {
    if (!user) {
      throw new UnauthorizedException('Token inválido o no proporcionado');
    }
    return this.productsService.update(+id, updateProductDto, user);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Desactivar producto (eliminación lógica)',
    description: 'Desactiva un producto cambiando su estado is_active a false'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'ID del producto a desactivar',
    example: 1
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Producto desactivado exitosamente',
    type: Product,
    examples: {
      'Producto desactivado': {
        summary: 'Ejemplo de producto desactivado',
        value: {
          product_id: 1,
          code: "IP13-128",
          name: "iPhone 13 128GB",
          description: "Smartphone con chip A15 Bionic",
          price: 17999,
          brand_id: 1,
          is_active: false,
          created_at: "2023-01-01",
          updated_at: "2023-07-15",
          brand: {
            brand_id: 1,
            name: "Apple",
            description: "Empresa líder en tecnología",
            is_active: true,
            created_at: "2023-01-01",
            updated_at: "2023-01-01"
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'No autorizado',
    examples: {
      'Token inválido': {
        summary: 'Error de autenticación',
        value: {
          statusCode: 401,
          message: 'Token inválido o no proporcionado',
          error: 'Unauthorized'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Producto no encontrado',
    examples: {
      'Producto no existe': {
        summary: 'Producto no encontrado',
        value: {
          statusCode: 404,
          message: 'Producto no encontrado',
          error: 'Not Found'
        }
      }
    }
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    if (!user) {
      throw new UnauthorizedException('Token inválido o no proporcionado');
    }
    return this.productsService.deactivate(+id, user);
  }
}