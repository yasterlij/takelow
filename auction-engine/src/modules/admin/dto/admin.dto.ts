import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  IsDateString,
  IsEnum,
  IsObject,
} from "class-validator";
import { AuctionStatus } from "../../winner/entities/auction.entity";

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];

  @IsNumber()
  @Min(0)
  current_market_price: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsObject()
  specs?: Record<string, string>;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  current_market_price?: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsObject()
  specs?: Record<string, string>;
}

export class CreateAuctionDto {
  @IsString()
  product_id: string;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsOptional()
  @IsNumber()
  min_bid?: number;

  @IsOptional()
  @IsNumber()
  max_bid?: number;

}

export class UpdateAuctionDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsDateString()
  start_time?: string;

  @IsOptional()
  @IsDateString()
  end_time?: string;

  @IsOptional()
  @IsNumber()
  min_bid?: number;

  @IsOptional()
  @IsNumber()
  max_bid?: number;

  @IsOptional()
  @IsEnum(AuctionStatus)
  status?: AuctionStatus;
}
