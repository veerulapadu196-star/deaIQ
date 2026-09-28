import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  return (
    <div className="error-card" role="alert">
      <div className="error-icon">
        <AlertTriangle size={20} />
      </div>
      <div className="error-content">
        <div className="error-title">{title}</div>
        <div className="error-message">{message}</div>
      </div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={13} />
          Retry
        </button>
      )}
    </div>
  );
};
