import { ApiProperty } from '@nestjs/swagger';

export class UserSwagger {
  @ApiProperty()
  user_id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
