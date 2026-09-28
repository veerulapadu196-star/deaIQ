import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ children, className = 'badge-default', style }) => {
  return (
    <span className={`badge ${className}`} style={style}>
      {children}
    </span>
  );
};
