import api from '@/lib/api/axiosInstance';
import type { StudioSettings, StudioSettingsRequest } from '@/lib/types/settings';

export async function getStudioSettings(): Promise<StudioSettings> {
  const { data } = await api.get<StudioSettings>('/admin/settings');
  return data;
}

export async function updateStudioSettings(
  request: StudioSettingsRequest
): Promise<StudioSettings> {
  const { data } = await api.put<StudioSettings>('/admin/settings', request);
  return data;
}
