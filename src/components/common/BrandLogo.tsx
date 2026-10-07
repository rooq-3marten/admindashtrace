import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
  const subSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Natural Botanical Harvest Emblem */}
      <div
        className={`flex items-center justify-center ${iconSize} rounded-xl bg-[#EEF5F1] dark:bg-[#142D1F] border border-[#D8E8DE] dark:border-[#244733] shadow-xs shrink-0 text-[#1A4D2E] dark:text-[#86EFAC] transition-transform hover:scale-105`}
        title="TraceHarvest Nigeria"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          aria-hidden="true"
        >
          {/* Subtle warm soil / sun arc */}
          <path
            d="M8 26C11 24.5 15 24 16 24C17 24 21 24.5 24 26"
            stroke="#B8860B"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.8"
          />

          {/* Central organic grain stem */}
          <path
            d="M16 26V6C16 4.5 15.5 3.5 15.5 3.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />

          {/* Top Grain Seed (Sesame / Wheat head) */}
          <path
            d="M16 4C14.8 2.8 17.2 2.8 16 4Z"
            fill="#B8860B"
          />

          {/* Upper Kernels */}
          <path
            d="M16 6.5C13.8 5.2 11.2 7 12.5 9.5C13.5 11.2 16 8.5 16 6.5Z"
            fill="currentColor"
          />
          <path
            d="M16 8C18.2 6.7 20.8 8.5 19.5 11C18.5 12.7 16 10 16 8Z"
            fill="currentColor"
          />

          {/* Mid Kernels */}
          <path
            d="M16 10.5C13.2 9.2 10.5 11.2 11.8 14C12.8 16 16 12.8 16 10.5Z"
            fill="currentColor"
          />
          <path
            d="M16 12C18.8 10.7 21.5 12.7 20.2 15.5C19.2 17.5 16 14.3 16 12Z"
            fill="currentColor"
          />

          {/* Lower Kernels */}
          <path
            d="M16 15C13.5 14 11.2 16.2 12.2 18.8C13.2 20.6 16 17.5 16 15Z"
            fill="currentColor"
          />
          <path
            d="M16 16.5C18.5 15.5 20.8 17.7 19.8 20.3C18.8 22.1 16 19 16 16.5Z"
            fill="currentColor"
          />

          {/* Natural base sprout leaf */}
          <path
            d="M16 22C13 21 8.5 22 7.5 24.5C10.5 25.2 14.5 23.5 16 22Z"
            fill="currentColor"
            fillOpacity="0.75"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="min-w-0">
        <div className={`font-serif font-bold ${titleSize} tracking-tight text-[#1A2E23] dark:text-white leading-tight truncate`}>
          TraceHarvest
        </div>
        {showSubtitle && (
          <div className={`${subSize} font-medium text-[#5A6B60] dark:text-[#8A968E] leading-none tracking-normal truncate`}>
            Control Center · Nigeria
          </div>
        )}
      </div>
    </div>
  );
};
