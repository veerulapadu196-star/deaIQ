import React from 'react';
import type { Interaction } from '../../types';
import { formatDate, formatRelativeTime } from '../../utils';
import { Badge } from '../common/Badge';
import { Phone, MessageSquare, Mail, FileText, Brain } from 'lucide-react';

interface InteractionTimelineProps {
  interactions: Interaction[];
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Call: <Phone size={13} />,
  Meeting: <MessageSquare size={13} />,
  Email: <Mail size={13} />,
  Note: <FileText size={13} />,
};

export const InteractionTimeline: React.FC<InteractionTimelineProps> = ({ interactions }) => {
  if (interactions.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '24px 16px' }}>
        <div className="empty-title" style={{ fontSize: 14 }}>
          No customer interactions recorded yet
        </div>
        <div className="empty-description" style={{ fontSize: 13 }}>
          Add your call or meeting notes below to build DealIQ long-term memory.
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {interactions.map((it, idx) => (
        <div key={it.id} className="timeline-item">
          <div className="timeline-marker">
            {TYPE_ICONS[it.interaction_type] || <MessageSquare size={13} />}
          </div>

          <div className="timeline-card">
            <div className="timeline-header">
              <div className="flex items-center gap-2">
                <span className="timeline-num">#{idx + 1}</span>
                <Badge className="badge-type">{it.interaction_type}</Badge>
                {it.memory_saved && (
                  <Badge className="badge-memory" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Brain size={10} />
                    In Memory
                  </Badge>
                )}
              </div>
              <span className="timeline-date" title={formatDate(it.created_at)}>
                {formatRelativeTime(it.created_at)}
              </span>
            </div>

            <div className="timeline-content">{it.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
