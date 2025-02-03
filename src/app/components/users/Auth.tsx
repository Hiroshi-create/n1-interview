"use client"

import React from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/context/components/ui/button'
import { Card } from '@/context/components/ui/card'
import { useAppsContext } from '@/context/AppContext'
import { doc } from 'firebase/firestore'
import { db } from '../../../../firebase'

interface AuthProps {
  acceptingGuestUsers?: boolean
}

interface InitializeGuestUserInterviewResponse {
    guestUserPathname: string;
    guestUserId: string;
    theme: string;
    themeId: string;
    interviewId: string;
    interviewRefPath: string;
}

const Auth: React.FC<AuthProps> = ({ acceptingGuestUsers = false }) => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    setUserId,
    setSelectThemeName,
    setSelectedThemeId,
    setSelectedInterviewId,
    setSelectedInterviewRef,
  } = useAppsContext();

  const getThemeId = () => {
    const uuidRegex = /\/guest-user\/([0-9a-fA-F-]{36})/;
    const match = pathname.match(uuidRegex);
    if (!match) {
      alert('インタビューの情報取得エラー');
      return "";
    }
    setSelectedThemeId(match[1]);
    return match[1];
  }

  const handleEmailSignup = () => {
    if (acceptingGuestUsers) {
      const themeId = getThemeId();
      router.push(`/users/register/${themeId}`);
    } else {
      router.push(`/users/register`);
    }
  }

  const handleLogin = () => {
    if (acceptingGuestUsers) {
      const themeId = getThemeId();
      router.push(`/users/login/${themeId}`);
    } else {
      router.push('/users/login');
    }
  }

  const handleGuestLogin = async () => {
    const themeId = getThemeId();
    try {
      const response = await fetch('/api/initialize_guest_user_interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acquiredThemeId: themeId }),
      });
  
      if (!response.ok) {
        throw new Error(`ゲストユーザー作成に失敗しました: ${response.status}`);
      }
  
      const data: InitializeGuestUserInterviewResponse = await response.json();
  
      if (data && data.guestUserPathname && data.guestUserId && data.theme 
        && data.themeId && data.interviewId && data.interviewRefPath) {
        setUserId(data.guestUserId);
        const interviewRef = doc(db, data.interviewRefPath);
        setSelectedInterviewRef(interviewRef);
        setSelectedInterviewId(data.interviewId);
        setSelectThemeName(data.theme);
        setSelectedThemeId(data.themeId);
        router.push(data.guestUserPathname);
      } else {
        throw new Error('サーバーからの応答が不完全です');
      }
    } catch (error) {
      console.error('ゲストユーザーログインエラー:', error);
      alert('ゲストユーザーログインエラー');
    }
  }

  return (
    <Card className="w-full max-w-5xl overflow-hidden shadow-xl">
      <div className="grid md:grid-cols-2">
        {/* Left Panel */}
        <div className="p-8 flex flex-col justify-between bg-white">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-800">Auto N1 Interview へようこそ</h1>
            <p className="text-sm text-gray-600 mb-8">始めましょう - 無料です。</p>
            
            <div className="space-y-6">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 py-8 text-lg font-semibold transition-colors duration-300 rounded-lg shadow-md hover:shadow-lg flex items-center justify-center"
                onClick={handleEmailSignup}
              >
                <span>メールでサインアップ</span>
              </Button>
              
              {acceptingGuestUsers && (
                <Button
                  variant="outline"
                  className="w-full py-7 text-lg font-semibold border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors duration-300 rounded-lg shadow-sm hover:shadow-md flex items-center justify-center"
                  onClick={handleGuestLogin}
                >
                  <span>ゲストユーザーでインタビューに回答</span>
                </Button>
              )}
              
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  <span className="bg-white px-4 text-gray-500 font-medium">または</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full py-7 text-lg font-semibold flex items-center justify-center border-2 border-gray-300 hover:bg-gray-50 transition-colors duration-300 rounded-lg shadow-sm hover:shadow-md"
                onClick={() => {}}
              >
                <Image
                  src="https://cloudinary-res.cloudinary.com/image/upload/v1645708175/sign_up/cdnlogo.com_google-icon.svg"
                  alt="Google"
                  width={28}
                  height={28}
                  className="mr-4"
                  draggable={false}
                />
                <span>Googleでサインアップ</span>
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-600">
            <p className="mb-4">
              サインアップすることで、Auto N1 Interviewの
              <a href="/terms/TermsOfService" className="text-blue-600 hover:underline">利用規約</a>
              と
              <a href="/terms/PrivacyPolicy" className="text-blue-600 hover:underline">プライバシーポリシー</a>
              を読み、理解し、同意したことを示します。
            </p>
            <p>
              すでにアカウントをお持ちですか？
              <Button variant="link" className="text-blue-600 hover:underline ml-1 p-0" onClick={handleLogin}>
                ログイン
              </Button>
            </p>
          </div>
        </div>

        {/* Right Panel */}
        <div className="relative hidden md:block bg-gradient-to-br from-blue-600 to-purple-600 p-8 text-white">
          <div className="absolute inset-0 opacity-10">
            <Image
              src="/logo/logo_square.svg"
              alt="Background pattern"
              layout="fill"
              objectFit="cover"
              draggable={false}
            />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <Image
              src="/logo/logo_square.svg"
              alt="Brand logo"
              width={80}
              height={80}
              className="mb-8"
              draggable={false}
            />
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Trusted by 2M+ developers
              </h2>
              <p className="text-xl">
                Join our community and start your journey today!
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default Auth
