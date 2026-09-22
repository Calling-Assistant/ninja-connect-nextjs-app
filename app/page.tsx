'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Disable SSR for the entire app since it relies on browser APIs (localStorage, navigator, etc.)
const AppClient = dynamic(() => import('@/components/AppClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
    </div>
  ),
});

export default function Home() {
  return <AppClient />;
}
