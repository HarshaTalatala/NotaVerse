import React from 'react';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

interface StatusBadgeProps {
  status: RegistrationStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusStyles = (status: RegistrationStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: RegistrationStatus) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusText = (status: RegistrationStatus) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(status)} ${className}`}
    >
      <span className="text-xs">{getStatusIcon(status)}</span>
      {getStatusText(status)}
    </span>
  );
};

export default StatusBadge;