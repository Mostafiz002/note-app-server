import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class MoveNoteFolderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folderId?: number;
}
