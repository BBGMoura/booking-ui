import type { ClassType } from '@/lib/types/booking';
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
