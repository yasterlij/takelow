import { IsInt, Min, IsNotEmpty } from 'class-validator';

export class BidDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  amount: number;
}
