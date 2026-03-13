import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;
}
