import { IsString, IsOptional, Matches, MinLength, MaxLength, IsEmail } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{9,15}$/)
  phone_number?: string;

  @IsString()
  @MinLength(4)
  @MaxLength(255)
  password: string;
}
