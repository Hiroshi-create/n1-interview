'use client'

import React from 'react'
import { useForm, SubmitHandler } from "react-hook-form"
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Inputs = {
    email: string
    password: string
    name: string
}

const Register = () => {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<Inputs>();

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const result = await response.json();
                // トークンをローカルストレージに保存
                localStorage.setItem('token', result.token);
                router.push("/users/login");
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'ユーザー登録に失敗しました。');
            }
        } catch (error) {
            console.error('登録エラー:', error);
            alert('登録処理中にエラーが発生しました。');
        }
    };

    return (
        <div className='h-screen flex flex-col items-center justify-center'>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className='bg-white p-8 rounded-lg shadow-md w-96'
            >
                <h1 className='mb-4 text-2xl text-gray-700 font-medium'>新規登録</h1>
                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-600'>
                        名前
                    </label>
                    <input
                        {...register("name", {
                            required: "名前は必須です。",
                            minLength: {
                                value: 2,
                                message: "2文字以上入力してください。"
                            }
                        })}
                        type='text'
                        className='mt-1 border-2 rounded-md w-full p-2'
                    />
                    {errors.name && <span className='text-red-600 text-sm'>{errors.name.message}</span>}
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
                <div className='flex justify-end'>
                    <button
                        type='submit'
                        className='bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700'
                    >
                        新規登録
                    </button>
                </div>
                <div className='mt-4'>
                    <span className='text-gray-600 text-sm'>
                        既にアカウントをお持ちですか？
                    </span>
                    <Link href="/users/login" className='text-blue-500 text-sm font-bold ml-1 hover:text-blue-700'>
                        ログインページ
                    </Link>
                </div>
            </form>
        </div>
    )
}

export default Register
