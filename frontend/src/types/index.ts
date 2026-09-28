export type DealStage =
  | 'Discovery'
  | 'Qualification'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export type DealStatus = 'Active' | 'On Hold' | 'Closed';

export type InteractionType = 'Call' | 'Meeting' | 'Email' | 'Note';

export interface Deal {
  id: number;
  company_name: string;
  deal_name: string;
  deal_value: number;
  stage: DealStage;
  status: DealStatus;
  owner: string;
  expected_close_date: string | null;
  next_call_date: string | null;
  memory_bank_id: string | null;
  created_at: string;
  updated_at: string;
  interactions: Interaction[];
}

export interface DealListItem {
  id: number;
  company_name: string;
  deal_name: string;
  deal_value: number;
  stage: DealStage;
  status: DealStatus;
  owner: string;
  expected_close_date: string | null;
  next_call_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealCreateInput {
  company_name: string;
  deal_name: string;
  deal_value: number;
  stage: DealStage;
  status: DealStatus;
  owner: string;
  expected_close_date?: string | null;
  next_call_date?: string | null;
}

export interface Interaction {
  id: number;
  deal_id: number;
  deal_name?: string;
  company_name?: string;
  content: string;
  interaction_type: InteractionType;
  memory_saved: boolean;
  created_at: string;
}

export type Activity = Interaction;


export interface InteractionCreateInput {
  content: string;
  interaction_type: InteractionType;
}

export interface PipelineSummary {
  total_pipeline_value: number;
  active_deals: number;
  deals_needing_attention: number;
  total_deals: number;
}

export interface AISection {
  title: string;
  items: string[];
  content?: string | null;
}

export interface AIResponse {
  question: string;
  summary?: string | null;
  sections: AISection[];
  answer_raw: string;
  memory_used: boolean;
  recalled_memories?: string | null;
  model_used: string;
}

export interface CallBriefingResponse {
  deal_id: number;
  company_name: string;
  deal_name: string;
  deal_value: number;
  sections: AISection[];
  briefing_raw: string;
  model_used: string;
}

export interface FollowUpEmailResponse {
  deal_id: number;
  to: string;
  subject: string;
  body: string;
  model_used: string;
}

export interface MemoryCompareResponse {
  question: string;
  memory_on: AIResponse;
  memory_off: AIResponse;
}

export type PreparationStatus = 'idle' | 'preparing' | 'completed' | 'error';
export type EmailStatus = 'idle' | 'generating' | 'completed' | 'error';

