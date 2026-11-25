import { IsString, MaxLength, MinLength } from 'class-validator';

export class FinishLazygyuRoundDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  winnerName: string;
}
