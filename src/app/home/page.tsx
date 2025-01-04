"use client"

import React from 'react'
import Link from "next/link"
import Image from "next/image"
import { Button } from '@/context/components/ui/button'
import { useRouter } from 'next/navigation'

const Home = () => {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/users');
  };

  const handleClientStarted = () => {
    router.push('/clients/register');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19]">
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
          <div className="hidden md:flex items-center gap-8">
              <Image
                src="/logo/logo_yoko.svg"
                alt="Logo"
                width={120}
                height={120}
                className="text-white"
              />
              <Link href="#" className="text-gray-300 hover:text-white">PLATFORM</Link>
              <Link href="#" className="text-gray-300 hover:text-white">SOLUTIONS</Link>
              <Link href="#" className="text-gray-300 hover:text-white">DEVELOPERS</Link>
              <Link href="#" className="text-gray-300 hover:text-white">ABOUT US</Link>
              <Link href="#" className="text-gray-300 hover:text-white">PRICING</Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-4 text-sm text-gray-300">
                <Link href="#" className="hover:text-white">Contact</Link>
                <span>|</span>
                <Link href="#" className="hover:text-white">Support</Link>
                <span>|</span>
                <Link href="/users/login" className="hover:text-white">Login</Link>
              </div>
              <Button
                className="bg-[#E31C58] hover:bg-[#C01548] text-white"
                href="/users"
              >
                SIGN UP FOR FREE
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="max-w-4xl py-24">
          <h1 className="text-white text-6xl font-semibold mb-6">
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
              className="text-white border-white hover:bg-white/10 px-8 py-6 text-lg"
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
