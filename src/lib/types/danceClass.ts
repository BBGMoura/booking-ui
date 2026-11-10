import type { ClassType } from '@/lib/types/booking';
import type { UserRole } from '@/lib/types/auth';

/**
 * A dance class's pricing/availability for one class type
 * Matches backend DanceClassDTO
 */
export interface DanceClass {
  classType: ClassType;
  active: boolean;
  pricePerHour: number;
  role: UserRole;
}
