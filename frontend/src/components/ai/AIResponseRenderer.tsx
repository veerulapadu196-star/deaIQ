import React from 'react';
import type { AIResponse, AISection } from '../../types';
import { Badge } from '../common/Badge';
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  FileText,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface AIResponseRendererProps {
  response: AIResponse;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  SUMMARY: <Sparkles size={14} style={{ color: 'var(--color-brand)' }} />,
  'KEY FINDINGS': <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />,
  'CUSTOMER CONCERNS': <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />,
  RISKS: <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />,
  'RECOMMENDED NEXT STEPS': <Lightbulb size={14} style={{ color: 'var(--color-brand)' }} />,
  'CALL OBJECTIVE': <Sparkles size={14} style={{ color: 'var(--color-brand)' }} />,
  'WHAT HAPPENED PREVIOUSLY': <FileText size={14} style={{ color: 'var(--color-text-secondary)' }} />,
  'IMPORTANT PEOPLE': <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />,
  'QUESTIONS TO ASK': <HelpCircle size={14} style={{ color: 'var(--color-brand)' }} />,
  'TALKING POINTS': <Lightbulb size={14} style={{ color: 'var(--color-brand)' }} />,
  'RECOMMENDED NEXT STEP': <Lightbulb size={14} style={{ color: 'var(--color-success)' }} />,
  'DEAL CONTEXT': <FileText size={14} style={{ color: 'var(--color-text-muted)' }} />,
};

export const AIResponseRenderer: React.FC<AIResponseRendererProps> = ({ response }) => {
  return (
    <div className="ai-response-container">
      {/* Header bar */}
      <div className="ai-response-meta flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {response.memory_used ? (
            <Badge className="badge-memory" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Brain size={11} />
              Hindsight Memory Used
            </Badge>
          ) : (
            <Badge className="badge-default">Memory Off</Badge>
          )}
          {response.model_used && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Model: {response.model_used}
            </span>
          )}
        </div>
      </div>

      {/* Recalled Memory Peek if available */}
      {response.recalled_memories && (
        <div className="notice notice-memory mb-4">
          <div className="notice-title flex items-center gap-2 mb-1">
            <Brain size={13} />
            <span>Recalled from DealIQ Long-Term Memory</span>
          </div>
          <div className="recalled-text">{response.recalled_memories}</div>
        </div>
      )}

      {/* Structured Sections */}
      {response.sections && response.sections.length > 0 ? (
        <div className="ai-sections">
          {response.sections.map((section: AISection, idx: number) => {
            const normalizedTitle = section.title.toUpperCase();
            const icon = SECTION_ICONS[normalizedTitle] || <FileText size={14} />;

            return (
              <div key={idx} className="ai-section-card">
                <div className="ai-section-header">
                  {icon}
                  <span className="ai-section-title">{section.title}</span>
                </div>

                <div className="ai-section-body">
                  {section.items && section.items.length > 0 ? (
                    <ul className="ai-list">
                      {section.items.map((item: string, i: number) => (
                        <li key={i} className="ai-list-item">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : section.content ? (
                    <p className="ai-content-text">{section.content}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ai-content-text">{response.answer_raw}</div>
      )}
    </div>
  );
};
