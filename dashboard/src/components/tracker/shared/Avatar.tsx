/**
 * Avatar Component - Reusable avatar with gradient backgrounds
 */

import { generateAvatarGradient } from './utils';

interface AvatarProps {
  name: string;
  avatar?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function Avatar({ name, avatar, size = 'md', showTooltip = true, className = '' }: AvatarProps) {
  const sizeClasses = {
    xs: 'w-5 h-5 text-xs',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white shadow-sm ${className}`}
      style={{ background: generateAvatarGradient(name) }}
      title={showTooltip ? name : undefined}
    >
      {avatar ? (
        <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}
