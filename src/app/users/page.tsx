"use client"

import React from 'react';
import Auth from '../components/users/Auth';
import { Header } from '@/context/components/ui/header/header';

const AuthPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        className="h-14 border-b border-slate-700 flex flex-row items-center justify-between z-10"
        handleLogoClickPath={`/home`}
      />

      <div className='flex-grow flex flex-col items-center justify-center'>
        <Auth />
      </div>
    </div>
  );
}

export default AuthPage
