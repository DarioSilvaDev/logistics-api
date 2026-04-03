import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FindLocationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    maxLength: 120,
    description: 'Filter locations by name (partial, case-insensitive).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
