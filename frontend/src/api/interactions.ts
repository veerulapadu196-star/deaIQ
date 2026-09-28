import { api } from './client';
import type { Activity, Interaction, InteractionCreateInput } from '../types';

export const interactionsApi = {
  recent: (limit: number = 10) => api.get<Activity[]>(`/interactions/recent?limit=${limit}`),
  list: (dealId: number) => api.get<Interaction[]>(`/deals/${dealId}/interactions`),

  create: (dealId: number, data: InteractionCreateInput, saveToMemory: boolean = false) =>
    api.post<Interaction>(
      `/deals/${dealId}/interactions?save_to_memory=${saveToMemory}`,
      data
    ),
  saveToMemory: (dealId: number, interactionId: number) =>
    api.post<{ success: boolean; message: string }>(
      `/deals/${dealId}/interactions/${interactionId}/save-memory`
    ),
};
