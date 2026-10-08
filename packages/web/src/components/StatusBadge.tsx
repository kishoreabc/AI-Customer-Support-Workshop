import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeClass = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'ACTIVE':
      case 'PAID':
      case 'DELIVERED':
      case 'PUBLISHED':
      case 'RESOLVED':
      case 'IN_STOCK':
        return 'badge-success';

      case 'PENDING':
      case 'PROCESSING':
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
      case 'WAITING_FOR_CUSTOMER':
      case 'AI_ACTIVE':
      case 'IN_PROGRESS':
        return 'badge-warning';

      case 'SUSPENDED':
      case 'CANCELLED':
      case 'FAILED':
      case 'OUT_OF_STOCK':
      case 'URGENT':
      case 'HIGH':
        return 'badge-danger';

      case 'ESCALATED':
      case 'HUMAN_HANDOFF':
      case 'BACKORDER':
        return 'badge-info';

      default:
        return 'badge-neutral';
    }
  };

  return (
    <span className={`badge ${getBadgeClass(status)}`}>
      {status ? status.replace(/_/g, ' ') : 'UNKNOWN'}
    </span>
  );
};
