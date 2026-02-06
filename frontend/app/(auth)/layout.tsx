import React from 'react';
import { KycProvider } from '@/components/KycContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <KycProvider>{children}</KycProvider>;
}

