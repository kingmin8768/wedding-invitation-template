import { UserRole } from '../../users/user.entity';

export type AuthenticatedUser = {
  sub: number;
  email: string;
  role: UserRole;
};
