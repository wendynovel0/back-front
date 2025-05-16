import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActionLogsService } from './action-logs.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


@ApiTags('Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('logs')
export class ActionLogsController {
  constructor(private readonly actionLogsService: ActionLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener registros de acciones paginados con filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'actionType', required: false })
  @ApiQuery({ name: 'tableAffected', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs paginada con filtros aplicados',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              log_id: { type: 'number' },
              user_id: { type: 'number' },
              action_type: { type: 'string' },
              table_affected: { type: 'string' },
              record_id: { type: 'number' },
              old_values: { type: 'object' },
              new_values: { type: 'object' },
              action_timestamp: { type: 'string', format: 'date-time' },
              ip_address: { type: 'string' },
              user_agent: { type: 'string' },
            },
          },
        },
        count: { type: 'number' },
      },
    },
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('actionType') actionType?: string,
    @Query('tableAffected') tableAffected?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ) {
    return this.actionLogsService.findAll({
      page: Number(page),
      limit: Number(limit),
      actionType,
      tableAffected,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId: userId ? Number(userId) : undefined,
    });
  }
}
