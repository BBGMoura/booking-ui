import type { ClassType } from '@/lib/types/booking';
import type { UserRole } from '@/lib/types/auth';
import type { DanceClass } from '@/lib/types/danceClass';
import api from '@/lib/api/axiosInstance';

export async function getClassTypes(): Promise<ClassType[]> {
  const { data } = await api.get<ClassType[]>('/dance-classes/class-types');
  return data;
}

export async function getDanceClass(classType: ClassType): Promise<DanceClass> {
  const { data } = await api.get<DanceClass>('/dance-classes', {
    params: { classType },
  });
  return data;
}

export interface RoomRateRequest {
  classType: ClassType;
  pricePerHour: number;
  role: UserRole;
}

/** The active rates, at most one per booking type. */
export async function getActiveDanceClasses(): Promise<DanceClass[]> {
  const { data } = await api.get<DanceClass[]>('/admin/dance-classes');
  return data;
}

/** Makes this the active rate for its booking type, turning off the previous one. */
export async function setDanceClass(request: RoomRateRequest): Promise<DanceClass> {
  const { data } = await api.post<DanceClass>('/admin/dance-classes', request);
  return data;
}

export async function deactivateDanceClass(classType: ClassType): Promise<void> {
  await api.delete(`/admin/dance-classes/${classType}`);
}
