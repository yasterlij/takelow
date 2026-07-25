import { IsNumber, Min, IsNotEmpty } from "class-validator";

export class BidDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount: number;
}
