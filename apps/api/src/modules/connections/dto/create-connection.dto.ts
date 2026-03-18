import { IsString, IsNotEmpty, IsEnum, IsObject, MaxLength } from 'class-validator';
import { ConnectionFamily } from '@cogniviti/domain';

export class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEnum(ConnectionFamily)
  family!: ConnectionFamily;

  @IsObject()
  config!: Record<string, unknown>;
}
