import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  text?: string;
  size?: number;
  inline?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  text = 'Loading…',
  size = 22,
  inline = false,
}) => {
  if (inline) {
    return (
      <span className="loading-inline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Loader2 size={size} className="spinner" />
        {text && <span>{text}</span>}
      </span>
    );
  }

  return (
    <div className="loading-container" role="status" aria-live="polite">
      <Loader2 size={size} className="spinner" />
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
};
