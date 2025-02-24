'use client'

import React from 'react'
import { useForm, SubmitHandler } from "react-hook-form"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useAppsContext } from '@/context/AppContext'
import { auth } from '../../../../lib/firebase'
import { Header } from '@/context/components/ui/header/header'

type Inputs = {
    email: string
    password: string
}

const Login = () => {
    const router = useRouter();
    const { selectedThemeId } = useAppsContext();
    const { setIsUserAccount } = useAppsContext();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<Inputs>();

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        await signInWithEmailAndPassword(auth, data.email, data.password).then(
            (userCredential) => {
                const user = userCredential.user;
                setIsUserAccount(true);

                // router.push(`/auto-interview/${user.uid}/${selectedThemeId}/${interviewId}/description`);
                router.push(`/auto-interview/${user.uid}/${selectedThemeId}`);
            }
        ).catch((error) => {
            if(error.code === "auth/invalid-credential") {
                alert("ユーザーが登録されていません。")
            } else {
                alert(error.message)
            }
        });
    }

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
                    <h1 className='mb-4 text-2xl text-gray-700 font-medium'>ログイン</h1>
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-600'>
                            Email
                        </label>
                        <input
                            {...register("email", {
                                required: "メールアドレスは必須です。",
                                pattern: {
                                    value:
                                    /^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}$/,
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
                                required: "メールアドレスは必須です。",
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
                        type='submit'  // フォームで送信されると認識
                        className='bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700'>
                            ログイン
                        </button>
                    </div>
                    <div className='mt-4'>
                        <span className='text-gray-600 text-sm'>
                            初めてのご利用の方はこちら
                        </span>
                        <Link href={`/users/register/${selectedThemeId}`} className='text-blue-500 text-sm font-bold ml-1 hover:text-blue-700'>
                            新規登録ページへ
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Login