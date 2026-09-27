import React from 'react';
import { Student } from '../types';

interface ChibiAvatarProps {
  gender?: 'nam' | 'nu' | 'Nam' | 'Nữ' | string;
  styleIndex?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  avatarUrl?: string;
  student?: Partial<Student>;
}

export const ChibiAvatar: React.FC<ChibiAvatarProps> = ({
  gender = 'nam',
  styleIndex = 1,
  size = 'md',
  className = '',
  avatarUrl,
  student,
}) => {
  const url = avatarUrl || student?.avatarUrl || student?.photoUrl;
  const rawGender = student?.gender || gender || 'nam';
  const isGirl = rawGender.toLowerCase() === 'nu' || rawGender.toLowerCase() === 'nữ';
  const actualStyleIndex = student?.avatarStyle ?? styleIndex ?? 1;

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-base',
    lg: 'w-20 h-20 text-xl',
    xl: 'w-28 h-28 text-3xl',
  };

  if (url) {
    return (
      <div
        className={`relative rounded-full flex items-center justify-center shadow-md ring-4 ring-white/80 overflow-hidden shrink-0 bg-slate-100 ${sizeClasses[size]} ${className}`}
      >
        <img
          src={url}
          alt={student?.name || 'Avatar'}
          className="w-full h-full object-cover rounded-full"
        />
      </div>
    );
  }

  const bgGradients = [
    'bg-gradient-to-tr from-amber-400 to-yellow-200',
    'bg-gradient-to-tr from-blue-400 to-cyan-200',
    'bg-gradient-to-tr from-purple-400 to-pink-200',
    'bg-gradient-to-tr from-emerald-400 to-teal-200',
    'bg-gradient-to-tr from-rose-400 to-orange-200',
    'bg-gradient-to-tr from-indigo-400 to-purple-200',
  ];

  const bg = bgGradients[(actualStyleIndex - 1) % bgGradients.length];

  return (
    <div
      className={`relative rounded-full flex items-center justify-center shadow-md ring-4 ring-white/80 overflow-hidden shrink-0 ${bg} ${sizeClasses[size]} ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full p-1"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Head Base */}
        <circle cx="50" cy="52" r="32" fill="#FFE0BD" />
        
        {/* Blush */}
        <circle cx="34" cy="58" r="5" fill="#FFB2B2" opacity="0.6" />
        <circle cx="66" cy="58" r="5" fill="#FFB2B2" opacity="0.6" />

        {/* Hair */}
        {isGirl ? (
          <>
            {/* Girl Hair Back/Pigtails or Bob */}
            {actualStyleIndex % 2 === 0 ? (
              <>
                <path d="M18 50 C18 20, 82 20, 82 50 C82 75, 78 80, 75 80 C70 80, 72 55, 50 55 C28 55, 30 80, 25 80 C22 80, 18 75, 18 50 Z" fill="#4B2C20" />
                {/* Pigtails */}
                <circle cx="16" cy="45" r="9" fill="#FF6B81" />
                <circle cx="84" cy="45" r="9" fill="#FF6B81" />
              </>
            ) : (
              <path d="M20 48 C20 18, 80 18, 80 48 C80 72, 75 75, 50 48 C25 75, 20 72, 20 48 Z" fill="#2C1810" />
            )}
            {/* Bangs */}
            <path d="M22 42 C30 25, 45 42, 50 32 C55 42, 70 25, 78 42 C70 30, 30 30, 22 42 Z" fill="#3D2314" />
            {/* Hair Bow */}
            <path d="M42 22 L58 22 L53 17 L58 12 L42 12 L47 17 Z" fill="#FF4757" />
            <circle cx="50" cy="17" r="4" fill="#FFA502" />
          </>
        ) : (
          <>
            {/* Boy Short Hair / Cool style */}
            {actualStyleIndex % 2 === 0 ? (
              <path d="M20 50 C20 18, 80 18, 80 50 C80 40, 75 30, 50 28 C25 30, 20 40, 20 50 Z" fill="#1E272C" />
            ) : (
              <path d="M22 46 C20 20, 80 20, 78 46 C70 25, 60 22, 50 30 C40 22, 30 25, 22 46 Z" fill="#3B2314" />
            )}
            {/* Cap or Cool Hair spikes */}
            {actualStyleIndex % 3 === 0 && (
              <path d="M15 32 C25 15, 75 15, 85 32 L92 36 L82 36 Z" fill="#1E90FF" />
            )}
          </>
        )}

        {/* Eyes */}
        <ellipse cx="38" cy="50" rx="4" ry="5" fill="#2F3542" />
        <ellipse cx="62" cy="50" rx="4" ry="5" fill="#2F3542" />
        {/* Eye Shine */}
        <circle cx="39" cy="48" r="1.5" fill="#FFFFFF" />
        <circle cx="63" cy="48" r="1.5" fill="#FFFFFF" />

        {/* Cheerful Smile */}
        <path d="M44 63 Q50 70 56 63" stroke="#2F3542" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Optional Glasses on some styles */}
        {actualStyleIndex % 4 === 0 && (
          <g stroke="#1E272C" strokeWidth="2" fill="none">
            <circle cx="38" cy="50" r="8" />
            <circle cx="62" cy="50" r="8" />
            <line x1="46" y1="50" x2="54" y2="50" />
          </g>
        )}
      </svg>
    </div>
  );
};
