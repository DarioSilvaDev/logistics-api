import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TruckStatus } from '../schemas/truck.schema';

export class FindTrucksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: TruckStatus,
    description: 'Filter trucks by status.',
  })
  @IsOptional()
  @IsEnum(TruckStatus)
  status?: TruckStatus;
}
