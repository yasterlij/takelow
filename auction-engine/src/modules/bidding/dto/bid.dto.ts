import { IsNumber, Min, IsNotEmpty } from "class-validator";

export class BidDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1.00)
  @IsNotEmpty()
  amount: number;
}
