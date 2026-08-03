import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class DeductFeeDto {
  @IsUUID()
  user_id: string;

  @IsNumber()
  @Min(0.01)
  amount: number;
}