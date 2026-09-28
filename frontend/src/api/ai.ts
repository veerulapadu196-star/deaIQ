import { api } from './client';
import type {
  AIResponse,
  CallBriefingResponse,
  FollowUpEmailResponse,
  MemoryCompareResponse,
} from '../types';

export const aiApi = {
  chat: (dealId: number, question: string, useMemory: boolean = true) =>
    api.post<AIResponse>(`/deals/${dealId}/chat`, { question, use_memory: useMemory }),

  prepareCall: (dealId: number) =>
    api.post<CallBriefingResponse>(`/deals/${dealId}/prepare-call`),

  followUpEmail: (dealId: number) =>
    api.post<FollowUpEmailResponse>(`/deals/${dealId}/follow-up-email`),

  memoryCompare: (dealId: number, question: string) =>
    api.post<MemoryCompareResponse>(`/deals/${dealId}/memory-compare`, { question }),
};
