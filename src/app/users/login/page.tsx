'use client'

import React, { useState } from 'react'
import { useForm, SubmitHandler } from "react-hook-form"
import Link from 'next/link'
import { signInWithEmailAndPassword, getMultiFactorResolver, TotpMultiFactorGenerator } from 'firebase/auth'
import { auth } from '../../../lib/firebase'
import { useAppsContext } from '@/context/AppContext'
import { getTenantIdForDomain } from '@/context/lib/getTenantIdForDomain'
import { NextResponse } from 'next/server'
import { useRouter } from 'next/navigation'
import { Header } from '@/context/components/ui/header/header'

type Inputs = {
    email: string
    password: string
    totpCode?: string
}

const Login = () => {
    const router = useRouter();
    const { setIsUserAccount } = useAppsContext();
    const [isMFARequired, setIsMFARequired] = useState<boolean>(false);
    const [multiFactorResolver, setMultiFactorResolver] = useState<any>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<Inputs>();
    
    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        const domain = data.email.split('@')[1];
        const tenantId = await getTenantIdForDomain(domain);
    
        if (tenantId) {
            auth.tenantId = tenantId;
        } else {
            const generalTenantId = process.env.NEXT_PUBLIC_FIREBASE_GENERAL_TENANT_ID;
            if (!generalTenantId) {
                console.error('テナントIDが設定されていません。');
                return NextResponse.json({ message: 'テナントIDが設定されていません。' }, { status: 500 });
            }
            auth.tenantId = generalTenantId;
        }

        console.log("テナントID : " + auth.tenantId + " * メールアドレス : " + data.email)
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;
            setIsUserAccount(true);
            router.push(`/auto-interview/${user.uid}`)
        } catch (error: any) {
            if (error.code === 'auth/multi-factor-auth-required') {
                const resolver = getMultiFactorResolver(auth, error);
                setMultiFactorResolver(resolver);
                setIsMFARequired(true);
            } else if (error.code === "auth/invalid-credential") {
                alert("ユーザーが登録されていません。");
            } else {
                alert(error.message);
            }
        }
    }
    
    const verifyTOTP = async (totpCode: string) => {
        try {
            if (multiFactorResolver) {
                const selectedHint = multiFactorResolver.hints[0]; // 最初のヒントを使用
                const credential = TotpMultiFactorGenerator.assertionForSignIn(
                    selectedHint.uid,
                    totpCode
                );
                const userCredential = await multiFactorResolver.resolveSignIn(credential);
                setIsUserAccount(true);
                alert("TOTP認証が正常に完了しました。");
                router.push(`/auto-interview/${userCredential.user.uid}`);
            } else {
                throw new Error("多要素認証の情報がありません。");
            }
        } catch (error) {
            console.error("TOTP認証に失敗しました:", error);
            if (error instanceof Error) {
                alert(`TOTP認証に失敗しました: ${error.message}`);
            } else {
                alert("TOTP認証に失敗しました。もう一度お試しください。");
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
                {!isMFARequired ? (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className='bg-white p-8 rounded-lg shadow-md w-96'
                    >
                        <h1 className='mb-4 text-2xl text-gray-700 font-medium'>ログイン</h1>
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
                        <div className='flex justify-end'>
                            <button
                            type='submit'
                            className='bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700'>
                                ログイン
                            </button>
                        </div>
                        <div className='mt-4'>
                            <span className='text-gray-600 text-sm'>
                                初めてのご利用の方はこちら
                            </span>
                            <Link href={"/users/register"} className='text-blue-500 text-sm font-bold ml-1 hover:text-blue-700'>
                                新規登録ページへ
                            </Link>
                        </div>
                    </form>
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
            </div>
        </div>
    )
}

export default Login