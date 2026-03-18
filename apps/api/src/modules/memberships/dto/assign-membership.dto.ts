import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { UserRole } from '@cogniviti/domain';

export class AssignMembershipDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
