'use client'

import React from 'react'
import { useForm, SubmitHandler } from "react-hook-form"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { countries, languages, organizationTypes, positions } from '@/context/components/lists'

type Inputs = {
    lastName: string
    firstName: string
    gender: 'man' | 'woman' | 'Unanswered'
    userBirthday: {
        year: string
        monthDay: string
    }
    organizationType: string
    organizationName: string
    departmentName: string
    position: string
    email: string
    password: string
    phoneNumber: string
    employeeCount: number
    country: string
    language: string
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
            const response = await fetch('/api/auth/client_register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('token', result.token);
                router.push("/clients/login");
            } else {
                const errorData = await response.json();
                alert(errorData.message || '登録に失敗しました。');
            }
        } catch (error) {
            console.error('登録エラー:', error);
            alert('登録処理中にエラーが発生しました。');
        }
    };

    return (
        <div className='min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className='bg-white p-8 rounded-lg shadow-md w-full max-w-md'
            >
                <h1 className='mb-6 text-2xl text-gray-700 font-medium text-center'>新規登録（組織）</h1>
                
                <div className='mb-4 flex space-x-4'>
                    <div className='flex-1'>
                        <label className='block text-sm font-medium text-gray-600'>
                            姓<span className='text-red-600'>*</span>
                        </label>
                        <input
                            {...register("lastName", { required: "姓は必須です。" })}
                            type='text'
                            className='mt-1 border-2 rounded-md w-full p-2'
                        />
                        {errors.lastName && <span className='text-red-600 text-sm'>{errors.lastName.message}</span>}
                    </div>
                    <div className='flex-1'>
                        <label className='block text-sm font-medium text-gray-600'>
                            名<span className='text-red-600'>*</span>
                        </label>
                        <input
                            {...register("firstName", { required: "名は必須です。" })}
                            type='text'
                            className='mt-1 border-2 rounded-md w-full p-2'
                        />
                        {errors.firstName && <span className='text-red-600 text-sm'>{errors.firstName.message}</span>}
                    </div>
                </div>

                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-600'>
                        性別<span className='text-red-600'>*</span>
                    </label>
                    <select
                        {...register("gender", { required: "性別を選択してください。" })}
                        className='mt-1 border-2 rounded-md w-full p-2'
                    >
                        <option value="">選択してください</option>
                        <option value="man">男性</option>
                        <option value="woman">女性</option>
                        <option value="Unanswered">未回答</option>
                    </select>
                    {errors.gender && <span className='text-red-600 text-sm'>{errors.gender.message}</span>}
                </div>

                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-600'>
                        生年月日<span className='text-red-600'>*</span>
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

                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-600'>
                        組織タイプ<span className='text-red-600'>*</span>
                    </label>
                    <select {...register("organizationType", { required: "組織タイプを選択してください。" })} className='mt-1 border-2 rounded-md w-full p-2'>
                        <option value="">選択してください</option>
                        {organizationTypes.map(type => (
                        type.options ? (
                            <optgroup key={type.label} label={type.label}>
                            {type.options.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                            </optgroup>
                        ) : (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        )
                        ))}
                    </select>
                    {errors.organizationType && <span className='text-red-600 text-sm'>{errors.organizationType.message}</span>}
                    </div>

                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-600'>
                        組織名<span className='text-red-600'>*</span>
                    </label>
                    <input
                        {...register("organizationName", { required: "組織名は必須です。" })}
                        type='text'
                        className='mt-1 border-2 rounded-md w-full p-2'
                    />
                    {errors.organizationName && <span className='text-red-600 text-sm'>{errors.organizationName.message}</span>}
                </div>

                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-600'>部署名</label>
                    <input
                        {...register("departmentName")}
                        type='text'
                        className='mt-1 border-2 rounded-md w-full p-2'
                    />
                </div>

                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-600'>
                        役職<span className='text-red-600'>*</span>
                    </label>
                    <select
                        {...register("position", { required: "役職を選択してください。" })}
                        className='mt-1 border-2 rounded-md w-full p-2'
                    >
                        <option value="">選択してください</option>
                        {positions.map((pos) => (
                            <option key={pos} value={pos}>{pos}</option>
                        ))}
                    </select>
                    {errors.position && <span className='text-red-600 text-sm'>{errors.position.message}</span>}
                </div>

                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-600'>
                        勤務先メールアドレス<span className='text-red-600'>*</span>
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
                        電話(携帯)番号<span className='text-red-600'>*</span>
                    </label>
                    <input
                        {...register("phoneNumber", { required: "電話番号は必須です。" })}
                        type='tel'
                        className='mt-1 border-2 rounded-md w-full p-2'
                    />
                    {errors.phoneNumber && <span className='text-red-600 text-sm'>{errors.phoneNumber.message}</span>}
                </div>

                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-600'>
                        パスワード<span className='text-red-600'>*</span>
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
                        従業員数<span className='text-red-600'>*</span>
                    </label>
                    <input
                        {...register("employeeCount", { 
                            required: "従業員数は必須です。",
                            valueAsNumber: true,
                            min: { value: 1, message: "1以上の数を入力してください。" }
                        })}
                        type='number'
                        className='mt-1 border-2 rounded-md w-full p-2'
                    />
                    {errors.employeeCount && <span className='text-red-600 text-sm'>{errors.employeeCount.message}</span>}
                </div>

                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-600'>
                        国/地域<span className='text-red-600'>*</span>
                    </label>
                    <select
                        {...register("country", { required: "国/地域を選択してください。" })}
                        className='mt-1 border-2 rounded-md w-full p-2'
                    >
                        <option value="">選択してください</option>
                        {countries.map((country) => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>
                    {errors.country && <span className='text-red-600 text-sm'>{errors.country.message}</span>}
                </div>

                <div className='mb-6'>
                    <label className='block text-sm font-medium text-gray-600'>
                        言語<span className='text-red-600'>*</span>
                    </label>
                    <select
                        {...register("language", { required: "言語を選択してください。" })}
                        className='mt-1 border-2 rounded-md w-full p-2'
                    >
                        <option value="">選択してください</option>
                        {languages.map((lang) => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                    {errors.language && <span className='text-red-600 text-sm'>{errors.language.message}</span>}
                </div>

                <div className='flex justify-end'>
                    <button
                        type='submit'
                        className='bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700'
                    >
                        新規登録
                    </button>
                </div>
                <div className='mt-4 text-center'>
                    <span className='text-gray-600 text-sm'>
                        既にアカウントをお持ちですか？
                    </span>
                    <Link href="/clients/login" className='text-blue-500 text-sm font-bold ml-1 hover:text-blue-700'>
                        ログインページ
                    </Link>
                </div>
            </form>
        </div>
    )
}

export default Register
