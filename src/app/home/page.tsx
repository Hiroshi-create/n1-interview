"use client"

import React from 'react';
import { Button } from '@/context/components/ui/button';
import { useRouter } from 'next/navigation';
import { Header } from '@/context/components/ui/header';

const Home = () => {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/users/');
  };

  const handleClientStarted = () => {
    router.push('/clients/register');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        className="h-14 border-b border-slate-700 flex flex-row items-center justify-between z-10"
        handleLogoClickPath={`/home`}
      />

      <main className="container mx-auto px-4">
        <div className="max-w-4xl py-24">
          <h1 className="text-text text-6xl font-semibold mb-6">
            Auto N1 Interview
          </h1>
          <div className="flex gap-4">
            <Button
              className="bg-[#3448F5] hover:bg-[#2438E5] text-white px-8 py-6 text-lg"
              onClick={handleGetStarted}
            >
              GET STARTED
            </Button>
            <Button
              className="text-text border-white hover:bg-white/10 px-8 py-6 text-lg"
              onClick={handleClientStarted}
            >
              CLIENT STARTED
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home
