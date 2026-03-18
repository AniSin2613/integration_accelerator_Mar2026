import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateReleaseDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+\.\d+\.\d+$/, { message: 'version must be semver e.g. 1.0.0' })
  version!: string;
}
