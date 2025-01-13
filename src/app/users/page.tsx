"use client"

import React from 'react'
import Image from 'next/image'
import { Button } from '../../context/components/ui/button'
import { Card } from '../../context/components/ui/card'
import { useRouter } from 'next/navigation'

const Auth = () => {

  const router = useRouter()

  const handleEmailSignup = () => {
    router.push('/users/register')
  }

  const handleLogin = () => {
    router.push('/users/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden">
        {/* Left Panel */}
        <div className="p-8 flex flex-col items-center">
          <h1 className="text-2xl font-semibold mb-2">Auto N1 Interview へようこそ</h1>
          <p className="text-sm text-muted-foreground mb-8">始めましょう - 無料です。</p>
          
          <div className="w-full space-y-4">
            <Button
              className="w-full bg-[#4751f6] hover:bg-[#3a43d6] py-6 text-lg font-semibold"
              onClick={handleEmailSignup}
            >
              メールでサインアップ
            </Button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">または</span>
              </div>
            </div>

            <Button variant="outline" className="w-full py-6 text-lg font-semibold flex items-center justify-center" onClick={() => {}}>
              <Image
                src="https://cloudinary-res.cloudinary.com/image/upload/v1645708175/sign_up/cdnlogo.com_google-icon.svg"
                alt="Google"
                width={24}
                height={24}
                className="mr-3"
              />
              Googleでサインアップ
            </Button>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p className="mb-4">
              サインアップすることで、Auto N1 Interviewの
              <a href="#" className="text-primary hover:underline">利用規約</a>
              と
              <a href="#" className="text-primary hover:underline">プライバシーポリシー</a>
              を読み、理解し、同意したことを示します。
            </p>
            <p>
              すでにアカウントをお持ちですか？
              <Button variant="link" className="text-primary hover:underline ml-1 p-0" onClick={handleLogin}>
                ログイン
              </Button>
            </p>
          </div>
        </div>

        {/* Right Panel */}
        <div className="relative hidden md:block bg-[#1a1b48] p-8 text-white">
          <div className="grid grid-cols-3 gap-4">
            <Image
              src="/logo/logo_square.svg"
              alt="Brand logo"
              layout="fill"
              objectFit="contain"
              className="opacity-90"
            />
          </div>
          
          <div className="absolute bottom-8 left-8 right-8">
            <h2 className="text-xl font-semibold mb-2">
              Trusted by 2M developers and
              <br />
              10,000+ customers worldwide
            </h2>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Auth
