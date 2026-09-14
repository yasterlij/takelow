import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class DeductFeeDto {
  @IsOptional()
  @IsUUID()
  auction_id?: string;

  @IsUUID()
  user_id: string;

  @IsNumber()
  @Min(0.01)
  amount: number;
}