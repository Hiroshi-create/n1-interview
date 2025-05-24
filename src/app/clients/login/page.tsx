'use client'

import React, { useState } from 'react'
import { useForm, SubmitHandler } from "react-hook-form"
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmailAndPassword, multiFactor, TotpMultiFactorGenerator, TotpSecret, sendEmailVerification, User, MultiFactorResolver, getMultiFactorResolver, MultiFactorError } from 'firebase/auth'
import { auth } from '../../../lib/firebase'
import { useAppsContext } from '@/context/AppContext'
import { FirebaseError } from 'firebase/app'
import { QRCodeSVG } from 'qrcode.react'
import { getTenantIdForDomain } from '@/context/lib/getTenantIdForDomain'
import { Header } from '@/context/components/ui/header/header'

type Inputs = {
  email: string
  password: string
  totpCode?: string
}

const Login = () => {
  const searchParams = useSearchParams();
  const planType = searchParams.get('') || null;
  const router = useRouter();
  const { setIsUserAccount, checkMFAStatus } = useAppsContext();
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isMFARequired, setIsMFARequired] = useState<boolean>(false);
  const [isNewMFASetup, setIsNewMFASetup] = useState<boolean>(false);
  const [multiFactorResolver, setMultiFactorResolver] = useState<MultiFactorResolver | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();

  const setupTOTP = async () => {
    try {
      if (!auth.currentUser?.emailVerified) {
        alert("メールアドレスの確認が必要です。確認メールを送信します。");
        if (auth.currentUser) {
          alert("確認メールを送信しました。メールボックス（迷惑メールフォルダも含む）を確認し、リンクをクリックして認証を完了してください。");
        } else {
          console.error("authにcurrentUserがありません。")
        }
        return;
      }

      // サーバーサイドのAPIを呼び出してTOTP MFAを有効化
      const response = await fetch('/api/auth/enable-totp-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: auth.tenantId,
        }),
        // 必要に応じて認証トークンなどを含める
      });

      if (!response.ok) {
        throw new Error('TOTP MFA の有効化に失敗しました');
      }

      const multiFactorUser = multiFactor(auth.currentUser!);
      const session = await multiFactorUser.getSession();
      console.log("ここまでいってる : " + auth.currentUser)
      const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
      
      const url = totpSecret.generateQrCodeUrl(auth.currentUser!.email!, "Auto-N1-Interview");
      setQrCodeUrl(url);
      setTotpSecret(totpSecret);
      setIsNewMFASetup(true);
    } catch (error) {
      console.error("TOTP setup failed", error);
      if (error instanceof FirebaseError) {
        console.error("Firebase error code:", error.code);
        console.error("Firebase error message:", error.message);
      }
      alert("TOTP 設定に失敗しました。もう一度お試しください。");
    }
  };

  const verifyTOTP = async (totpCode: string) => {
    try {
      if (isNewMFASetup) {
        if (!auth.currentUser) {
          throw new Error("ユーザーが認証されていません");
        }
        if (!totpSecret) {
          throw new Error("TOTPシークレットがありません。");
        }
        const multiFactorUser = multiFactor(auth.currentUser);
        const credential = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, totpCode);
        await multiFactorUser.enroll(credential, "TOTP");
        alert("TOTP認証が正常に設定されました。");
      } else if (multiFactorResolver) {
        const selectedHint = multiFactorResolver.hints[0];
        const credential = TotpMultiFactorGenerator.assertionForSignIn(selectedHint.uid, totpCode);
        const userCredential = await multiFactorResolver.resolveSignIn(credential);
        alert("TOTP認証が正常に完了しました。");
        await handleSuccessfulLogin(userCredential.user);
        if (planType === null) {
          router.push(`/client-view/${userCredential.user.uid}/Report`);
        } else {
          router.push(`/client-view/${userCredential.user.uid}/subscriptions?=${planType}`);
        }
      } else {
        throw new Error("多要素認証の情報がありません。");
      }
    } catch (error) {
      console.error("TOTP認証に失敗しました:", error);
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/invalid-verification-code') {
          alert("無効な認証コードです。もう一度お試しください。");
        } else {
          alert(`TOTP認証に失敗しました: ${error.message}`);
        }
      } else {
        alert("TOTP認証中に予期せぬエラーが発生しました。");
      }
    }
  };

  const handleSuccessfulLogin = async (user: User) => {
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/auth/client_login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.requireMFA) {
          await setupTOTP();
        } else if (result.organizationId) {
          setIsUserAccount(false);
          // await checkMFAStatus(user);
          // router.push(`/client-view/${user.uid}/Report`);
        } else {
          alert("組織に所属していません。");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ログインに失敗しました。');
      }
    } catch (error) {
      console.error('ログイン処理中にエラーが発生しました:', error);
      alert('ログイン処理中にエラーが発生しました。');
    }
  };

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      const domain = data.email.split('@')[1];
      const tenantId = await getTenantIdForDomain(domain);
      if (!tenantId) {
        setError('組織に登録しているメールアドレスを入力してください。');
        return;
      }
      auth.tenantId = tenantId;
  
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      console.log("カレントユーザー", userCredential.user, ":", auth.tenantId);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/multi-factor-auth-required') {
          const multiFactorError = error as unknown as MultiFactorError;
          const resolver = getMultiFactorResolver(auth, multiFactorError);
          setMultiFactorResolver(resolver);
          setIsMFARequired(true);
        } else {
          switch (error.code) {
            case 'auth/wrong-password':
              alert("パスワードが間違っています。");
              break;
            case 'auth/user-not-found':
              alert("メールアドレスまたはパスワードが間違っています。指定されたテナントにユーザーが存在するか確認してください。");
              break;
            default:
              alert(error.message);
          }
        }
      } else {
        alert("不明なエラーが発生しました。");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        className="h-14 border-b border-slate-700 flex flex-row items-center justify-between z-10"
        handleLogoClickPath={`/home`}
      />

      <div className='flex-grow flex flex-col items-center justify-center'>
        {!isMFARequired && !isNewMFASetup ? (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className='bg-white p-8 rounded-lg shadow-md w-96'
          >
            <h1 className='mb-4 text-2xl text-gray-700 font-medium'>ログイン(組織)</h1>
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-600'>
                Email
              </label>
              <input
                {...register("email", {
                  required: "メールアドレスは必須です。",
                  pattern: {
                    value: /^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}$/,
                    message: "不適切なメールアドレスです。"
                  }
                })}
                type='text' className='mt-1 border-2 rounded-md w-full p-2'
              />
              {errors.email && <span className='text-red-600 text-sm'>{errors.email.message}</span>}
            </div>
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-600'>
                Password
              </label>
              <input
                {...register("password", {
                  required: "パスワードは必須です。",
                  minLength: {
                    value: 6,
                    message: "6文字以上入力してください。"
                  }
                })}
                type='password' className='mt-1 border-2 rounded-md w-full p-2'
              />
              {errors.password && <span className='text-red-600 text-sm'>{errors.password.message}</span>}
            </div>
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            <div className='flex justify-end'>
              <button
                type='submit'
                className='bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700'
              >
                ログイン
              </button>
            </div>
          </form>
        ) : isNewMFASetup ? (
          <div className='bg-white p-8 rounded-lg shadow-md w-96'>
            <h2 className="text-xl font-medium mb-4">新規2段階認証設定</h2>
            {qrCodeUrl && (
              <div className="mt-4">
                <p className="mb-2">以下のQRコードをGoogle AuthenticatorまたはMicrosoft Authenticatorでスキャンしてください：</p>
                <QRCodeSVG value={qrCodeUrl} size={256} />
              </div>
            )}
            <form onSubmit={handleSubmit((data) => verifyTOTP(data.totpCode!))}>
              <input
                {...register("totpCode", { required: "TOTP コードは必須です" })}
                type="text"
                placeholder="認証アプリに表示されたコードを入力"
                className="mt-2 border-2 rounded-md w-full p-2"
              />
              {errors.totpCode && <span className="text-red-600 text-sm">{errors.totpCode.message}</span>}
              <button
                type="submit"
                className="mt-2 bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700"
              >
                検証
              </button>
            </form>
          </div>
        ) : (
          <div className='bg-white p-8 rounded-lg shadow-md w-96'>
            <h2 className="text-xl font-medium mb-4">2段階認証</h2>
            <form onSubmit={handleSubmit((data) => verifyTOTP(data.totpCode!))}>
              <input
                {...register("totpCode", { required: "TOTP コードは必須です" })}
                type="text"
                placeholder="認証アプリに表示されたコードを入力"
                className="mt-2 border-2 rounded-md w-full p-2"
              />
              {errors.totpCode && <span className="text-red-600 text-sm">{errors.totpCode.message}</span>}
              <button
                type="submit"
                className="mt-2 bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700"
              >
                検証
              </button>
            </form>
          </div>
        )}
        <div className='mt-4'>
          <span className='text-gray-600 text-sm'>
            初めてのご利用の方はこちら
          </span>
          <Link href={"/clients/register"} className='text-blue-500 text-sm font-bold ml-1 hover:text-blue-700'>
            新規登録ページへ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;