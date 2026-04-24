import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
