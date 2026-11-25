import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { LazygyuWinnerMode } from '../lazygyu-room.entity';

export class UpdateLazygyuControlDto {
  @IsOptional()
  @IsBoolean()
  submissionsOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  skillsEnabled?: boolean;

  @IsOptional()
  @IsIn(['first', 'last', 'nth'] satisfies LazygyuWinnerMode[])
  winnerMode?: LazygyuWinnerMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  nthWinner?: number;
}
