'use client'

import React, { useState } from 'react'
import { useForm, SubmitHandler } from "react-hook-form"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppsContext } from '@/context/AppContext'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { NextResponse } from 'next/server'
import { getTenantIdForDomain } from '@/context/lib/getTenantIdForDomain'
import { Header } from '@/context/components/ui/header/header'
import { useToast } from '@/context/ToastContext'
import { LoadingButton } from '@/context/components/ui/loading'

type Inputs = {
    email: string
    password: string
    userNickname: string
    gender: 'male' | 'female' | 'other' | 'not_specified'
    userBirthday: {
        year: string
        monthDay: string
    }
}

const Register = () => {
    const router = useRouter();
    const { selectedThemeId } = useAppsContext();
    const toast = useToast();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<Inputs>();

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        setIsLoading(true);
        try {
            const domain = data.email.split('@')[1];
            const tenantId = await getTenantIdForDomain(domain);
            
            if (tenantId) {
                setError('組織に属している場合は、こちらから作成できません。組織の管理者へご連絡ください。');
                return;
            }

            // 一般ユーザー用のテナントを指定
            const generalTenantId = process.env.NEXT_PUBLIC_FIREBASE_GENERAL_TENANT_ID;
            if (!generalTenantId) {
                console.error('テナントIDが設定されていません。');
                return NextResponse.json({ message: 'テナントIDが設定されていません。' }, { status: 500 });
            }
            auth.tenantId = generalTenantId;

            // Firebase Authenticationでユーザーを作成
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            const response = await fetch('/api/auth/user_register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    userId: user.uid,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('token', result.token);
                router.push(`/users/login/${selectedThemeId}`);
            } else {
                const errorData = await response.json();
                toast.error('ユーザー登録に失敗しました', errorData.message || '予期せぬエラーが発生しました。');
            }
        } catch (error) {
            console.error('登録エラー:', error);
            toast.error('登録処理中にエラーが発生しました');
            setError('登録処理中にエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header 
                className="h-14 border-b border-slate-700 flex flex-row items-center justify-between z-10"
                handleLogoClickPath={`/home`}
            />

            <div className='flex-grow flex flex-col items-center justify-center'>
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className='bg-white p-8 rounded-lg shadow-md w-96'
                >
                    <h1 className='mb-4 text-2xl text-gray-700 font-medium'>新規登録</h1>
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-600'>
                            ニックネーム
                        </label>
                        <input
                            {...register("userNickname", {
                                required: "名前は必須です。",
                                minLength: {
                                    value: 2,
                                    message: "2文字以上入力してください。"
                                }
                            })}
                            type='text'
                            className='mt-1 border-2 rounded-md w-full p-2'
                        />
                        {errors.userNickname && <span className='text-red-600 text-sm'>{errors.userNickname.message}</span>}
                    </div>
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-600'>
                            メールアドレス
                        </label>
                        <input
                            {...register("email", {
                                required: "メールアドレスは必須です。",
                                pattern: {
                                    value: /^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}$/,
                                    message: "不適切なメールアドレスです。"
                                }
                            })}
                            type='email'
                            className='mt-1 border-2 rounded-md w-full p-2'
                        />
                        {errors.email && <span className='text-red-600 text-sm'>{errors.email.message}</span>}
                    </div>
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-600'>
                            パスワード
                        </label>
                        <input
                            {...register("password", {
                                required: "パスワードは必須です。",
                                minLength: {
                                    value: 6,
                                    message: "6文字以上入力してください。"
                                }
                            })}
                            type='password'
                            className='mt-1 border-2 rounded-md w-full p-2'
                        />
                        {errors.password && <span className='text-red-600 text-sm'>{errors.password.message}</span>}
                    </div>
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-600'>
                            性別
                        </label>
                        <select
                            {...register("gender", { required: "性別を選択してください。" })}
                            className='mt-1 border-2 rounded-md w-full p-2'
                        >
                            <option value="">選択してください</option>
                            <option value="male">男性</option>
                            <option value="female">女性</option>
                            <option value="other">その他</option>
                            <option value="not_specified">未回答</option>
                        </select>
                        {errors.gender && <span className='text-red-600 text-sm'>{errors.gender.message}</span>}
                    </div>
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-600'>
                            生年月日
                        </label>
                        <div className='flex'>
                            <input
                                {...register("userBirthday.year", { required: "年を入力してください。" })}
                                type='text'
                                placeholder='年（例：1990）'
                                className='mt-1 border-2 rounded-md w-1/2 p-2 mr-2'
                            />
                            <input
                                {...register("userBirthday.monthDay", { required: "月日を入力してください。" })}
                                type='text'
                                placeholder='月日（例：0101）'
                                className='mt-1 border-2 rounded-md w-1/2 p-2'
                            />
                        </div>
                        {errors.userBirthday?.year && <span className='text-red-600 text-sm'>{errors.userBirthday.year.message}</span>}
                        {errors.userBirthday?.monthDay && <span className='text-red-600 text-sm'>{errors.userBirthday.monthDay.message}</span>}
                    </div>
                    {error && (
                        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}
                    <div className='flex justify-end'>
                        <LoadingButton
                            type='submit'
                            loading={isLoading}
                            loadingText="登録中..."
                            className='bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700'
                        >
                            新規登録
                        </LoadingButton>
                    </div>
                    <div className='mt-4'>
                        <span className='text-gray-600 text-sm'>
                            既にアカウントをお持ちですか？
                        </span>
                        <Link href={`/users/login/${selectedThemeId}`} className='text-blue-500 text-sm font-bold ml-1 hover:text-blue-700'>
                            ログインページ
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Register
