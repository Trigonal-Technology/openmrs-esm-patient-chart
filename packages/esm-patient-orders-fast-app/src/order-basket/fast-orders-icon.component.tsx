import React from 'react';

interface FastOrderIconProps {
  isTablet: boolean;
}

function FastOrderIcon({ isTablet }: FastOrderIconProps) {
  const size = isTablet ? 40 : 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_fast_order)">
        <path d="M24 0H0V24H24V0Z" fill="#CCE4FF" />
        <path d="M19 12L12 5V10H8L13 19V14H17L19 12Z" fill="#1E88E5" />
        {/* Simplified pill outline to ground the icon */}
        <path
          d="M6 14C6 12.8954 6.89543 12 8 12H16C17.1046 12 18 12.8954 18 14V17C18 18.1046 17.1046 19 16 19H8C6.89543 19 6 18.1046 6 17V14Z"
          fill="#1E88E5"
          fillOpacity="0.3"
        />
      </g>
      <defs>
        <clipPath id="clip0_fast_order">
          <rect width={size} height={size} fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export default FastOrderIcon;
