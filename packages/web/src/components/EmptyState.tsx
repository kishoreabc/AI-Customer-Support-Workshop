import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are no items matching your criteria or currently available in the system.',
  actionText,
  onAction,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', gap: '12px' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Inbox size={28} />
      </div>
      <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</h4>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '360px' }}>{description}</p>
      {actionText && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction} style={{ marginTop: '8px' }}>
          {actionText}
        </button>
      )}
    </div>
  );
};
