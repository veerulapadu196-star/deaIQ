import { api } from './client';
import type { Deal, DealListItem, DealCreateInput, PipelineSummary } from '../types';

export const dealsApi = {
  list: () => api.get<DealListItem[]>('/deals'),
  get: (id: number) => api.get<Deal>(`/deals/${id}`),
  create: (data: DealCreateInput) => api.post<Deal>('/deals', data),
  update: (id: number, data: Partial<DealCreateInput>) => api.put<Deal>(`/deals/${id}`, data),
  summary: () => api.get<PipelineSummary>('/deals/summary'),
};
