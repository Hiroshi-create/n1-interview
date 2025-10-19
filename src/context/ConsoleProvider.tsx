"use client"

import { useEffect } from 'react';
import { overrideConsole } from '@/lib/console-override';

export function ConsoleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // クライアントサイドでコンソールをオーバーライド
    overrideConsole();
  }, []);

  return <>{children}</>;
}