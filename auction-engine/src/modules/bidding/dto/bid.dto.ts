import { IsNumber, Min, IsNotEmpty } from "class-validator";

export class BidDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "Enter a valid bid amount" })
  @Min(1.00, { message: "Minimum bid is 1.00" })
  @IsNotEmpty()
  amount: number;
}
