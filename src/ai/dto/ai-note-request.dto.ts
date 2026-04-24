import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AiNoteRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  noteId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instruction?: string;
}
