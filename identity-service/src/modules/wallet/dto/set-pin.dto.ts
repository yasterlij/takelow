import { IsString, Length, Matches } from 'class-validator';

export class SetPinDto {
  @IsString()
  @Length(4, 6)
  @Matches(/^[0-9]+$/)
  pin: string;
}
