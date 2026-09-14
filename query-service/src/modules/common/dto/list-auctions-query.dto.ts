import { IsOptional, IsEnum, IsString, IsDecimal, IsInt, Min, Max } from 'class-validator';
import { AuctionStatus } from '@prisma/client';

export class ListAuctionsQueryDto {
  @IsOptional()
  @IsEnum(AuctionStatus)
  status?: AuctionStatus;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDecimal()
  @Min(0)
  min_price?: number;

  @IsOptional()
  @IsDecimal()
  @Min(0)
  max_price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
