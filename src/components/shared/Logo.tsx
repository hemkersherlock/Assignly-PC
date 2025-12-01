import React from 'react';
import Image from 'next/image';

const Logo = ({ className = 'h-8 w-8' }: { className?: string }) => {
  return (
    <Image
      src="/logo.png"
      alt="Assignly Logo"
      width={32}
      height={32}
      className={className}
      priority
    />
  );
};

export default Logo;
