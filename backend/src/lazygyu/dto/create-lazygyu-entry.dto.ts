import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLazygyuEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  displayName: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  clientKey?: string;
}
