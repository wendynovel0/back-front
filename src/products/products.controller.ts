import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Product } from './entities/product.entity';
import { CurrentUser } from '../auth/decorators/current-user-decorator';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { ProductView } from './entities/product-view.entity';
import { plainToInstance } from 'class-transformer';
import { ProductSwaggerDto } from './dto/product-swagger.dto';
import { Filters } from '../common/interfaces/filters.interface';
import { DateRangeFilterDto } from '../common/dto/date-range-filter.dto';


@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

@Get('view/:id')
@ApiOperation({ summary: 'Obtener producto por ID' })
@ApiParam({
  name: 'id',
  type: Number,
  description: 'ID del producto',
  example: 12,
})
@ApiResponse({
  status: 200,
  description: 'Producto encontrado',
  schema: {
    example: {
      product_id: 12,
      code: 'XBOX-X',
      product_name: 'Xbox Series X',
      description: 'Consola de juegos 4K con 1TB SSD y GPU de 12 TFLOPS',
      price: 12999.00,
      is_active: 'Sí',
      brand_name: 'Microsoft',
      supplier_name: 'Cloud Systems Inc'
    }
  }
})
@ApiResponse({ status: 400, description: 'ID inválido' })
@ApiResponse({ status: 404, description: 'Producto no encontrado' })
async findOneFromView(@Param('id') id: string) {
  if (isNaN(+id)) {
    throw new BadRequestException('ID inválido');
  }

  const product = await this.productsService.findOneMinimal(+id);
  
  if (!product) {
    throw new NotFoundException('Producto no encontrado');
  }

  return {
    product_id: product.product_id,
    code: product.code,
    product_name: product.product_name,
    description: product.description,
    price: product.price,
    is_active: product.product_is_active ? 'Sí' : 'No', 
    brand_name: product.brand_name,
    supplier_name: product.supplier_name
  };
}

@Get()
@ApiOperation({
  summary: 'Buscar productos con filtros combinados',
  description: 'Permite buscar productos por texto, estado, proveedor, marca y fechas de creación/edición'
})
@ApiQuery({ name: 'search', required: false, description: 'Texto libre en código, nombre, descripción, marca o proveedor' })
@ApiQuery({ name: 'dateType', required: false, enum: ['created_at', 'updated_at'] })
@ApiQuery({ name: 'startDate', required: false })
@ApiQuery({ name: 'endDate', required: false })
@ApiQuery({ name: 'isActive', required: false, description: 'Filtrar por estado activo (true/false)' })
@ApiQuery({ name: 'brandIds', required: false, description: 'IDs de marcas separados por coma' })
@ApiQuery({ name: 'supplierIds', required: false, description: 'IDs de proveedores separados por coma' })
@ApiResponse({ status: 200, description: 'Lista de productos encontrados', type: [ProductView] })
async findAllWithFilters(
  @Query('search') search?: string,
  @Query('dateType') dateType?: 'created_at' | 'updated_at',
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
  @Query('isActive') isActive?: string,
  @Query('brandIds') brandIds?: string,
  @Query('supplierIds') supplierIds?: string,
  @CurrentUser() user?: any,
) {
  if (!user) {
    throw new UnauthorizedException('Token inválido o no proporcionado');
  }

  let dateFilter: DateRangeFilterDto | undefined = undefined;

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

  const isActiveLower = isActive?.toLowerCase();
  const isActiveBoolean =
    isActiveLower === 'true' ? true :
    isActiveLower === 'false' ? false :
    undefined;

  const brandIdsArray = brandIds?.split(',').map(id => parseInt(id.trim())).filter(Boolean) || undefined;
  const supplierIdsArray = supplierIds?.split(',').map(id => parseInt(id.trim())).filter(Boolean) || undefined;

  const filters = {
    search,
    isActive: isActiveBoolean,
    brandIds: brandIdsArray,
    supplierIds: supplierIdsArray,
    dateFilter,
  };

  return this.productsService.findAll(filters);
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