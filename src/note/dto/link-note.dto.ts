import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class LinkNoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetNoteId!: number;
}
