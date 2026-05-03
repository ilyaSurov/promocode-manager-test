import { IsString, MaxLength, MinLength } from 'class-validator';

export class ApplyPromocodeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  code!: string;
}
