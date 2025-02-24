'use client'

import React, { useState } from 'react'
import { useForm, SubmitHandler } from "react-hook-form"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { countries, languages, organizationTypes, positions } from '@/context/components/lists'
import { Timestamp } from 'firebase/firestore'
import { Header } from '@/context/components/ui/header/header';
import { auth } from '@/lib/firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { getTenantIdForDomain } from '@/context/lib/getTenantIdForDomain'
import { NextResponse } from 'next/server'

type ClientInputs = {
  organizationType: string
  organizationName: string
  employeeCount: number
  country: string
  language: string
}

type UserInputs = {
  lastName: string
  firstName: string
  gender: 'male' | 'female' | 'other' | 'not_specified'
  userBirthday: {
    year: string
    monthDay: string
  }
  position: string
  email: string
  password: string
  phoneNumber: string
}

type FormInputs = ClientInputs & UserInputs

const Register = () => {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>()
  const [error, setError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    try {
      const domain = data.email.split('@')[1];
      const tenantId = await getTenantIdForDomain(domain);

      if (!tenantId) {
        setError('組織がまだ登録されていません。お問い合わせください。');
        return;
      }

      auth.tenantId = tenantId;

      console.log("作成するユーザーのテナントチェック : " + auth.tenantId)
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const userId = userCredential.user.uid;

      // Clientデータの作成（フォームで受け取った情報のみ）
      const clientData = {
        organizationType: data.organizationType,
        organizationName: data.organizationName,
        administratorId: userId,
        childUsersCount: 1,
        childUserIds: [userId],
        employeeCount: data.employeeCount,
        country: data.country,
        language: data.language,
      }

      // Userデータの作成（フォームで受け取った情報のみ）
      const userData = {
        email: data.email,
        userNickname: `${data.lastName}${data.firstName}`,
        userName: [data.lastName, data.firstName],
        userId,
        gender: data.gender,
        userBirthday: `${data.userBirthday.year}-${data.userBirthday.monthDay}T00:00:00Z`,
        organizationPosition: data.position,
        userPhoneNumber: data.phoneNumber.replace(/\D/g, '') !== '' ? data.phoneNumber.replace(/\D/g, '') : null,
      }

      // Firestoreへの保存処理
      const response = await fetch('/api/auth/client_register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client: clientData,
          user: userData
        }),
      })

      if (response.ok) {
        const result = await response.json()
        localStorage.setItem('token', result.token)
        router.push("/clients/login")
      } else {
        const errorData = await response.json()
        alert(errorData.message || '登録に失敗しました。')
      }
    } catch (error) {
      console.error('登録エラー:', error)
      setError('登録処理中にエラーが発生しました。');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        className="h-14 border-b border-slate-700 flex flex-row items-center justify-between z-10"
        handleLogoClickPath={`/home`}
      />

      <div className="max-w-2xl mx-auto mt-16 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">組織新規登録</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ユーザー情報セクション */}
          <section className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-4">管理者情報</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">姓*</label>
                <input
                  {...register("lastName", { required: "姓は必須です" })}
                  className="w-full p-2 border rounded"
                />
                {errors.lastName && <span className="text-red-500 text-sm">{errors.lastName.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">名*</label>
                <input
                  {...register("firstName", { required: "名は必須です" })}
                  className="w-full p-2 border rounded"
                />
                {errors.firstName && <span className="text-red-500 text-sm">{errors.firstName.message}</span>}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">性別*</label>
              <select
                {...register("gender", { required: "性別を選択してください" })}
                className="w-full p-2 border rounded"
              >
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
                <option value="not_specified">未回答</option>
              </select>
              {errors.gender && <span className="text-red-500 text-sm">{errors.gender.message}</span>}
            </div>

            {/* 生年月日入力フィールド */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">生年月日*</label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  {...register("userBirthday.year", { 
                    required: "年を入力してください",
                    min: { value: 1900, message: "有効な年を入力してください" }
                  })}
                  placeholder="年（例: 1990）"
                  className="w-full p-2 border rounded"
                />
                <input
                  type="text"
                  {...register("userBirthday.monthDay", { 
                    required: "月日を入力してください",
                    pattern: {
                      value: /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
                      message: "MM-DD形式で入力してください"
                    }
                  })}
                  placeholder="月日（例: 12-31）"
                  className="w-full p-2 border rounded"
                />
              </div>
              {errors.userBirthday?.year && (
                <span className="text-red-500 text-sm">{errors.userBirthday.year.message}</span>
              )}
              {errors.userBirthday?.monthDay && (
                <span className="text-red-500 text-sm">{errors.userBirthday.monthDay.message}</span>
              )}
            </div>
          </section>

          {/* 組織情報セクション */}
          <section className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-4">組織情報</h2>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">組織タイプ*</label>
              <select
                {...register("organizationType", { required: "組織タイプを選択してください" })}
                className="w-full p-2 border rounded"
              >
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
              {errors.organizationType && (
                <span className="text-red-500 text-sm">{errors.organizationType.message}</span>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">組織名*</label>
              <input
                {...register("organizationName", { required: "組織名は必須です" })}
                className="w-full p-2 border rounded"
              />
              {errors.organizationName && (
                <span className="text-red-500 text-sm">{errors.organizationName.message}</span>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">役職*</label>
              <select
                {...register("position", { required: "役職を選択してください" })}
                className="w-full p-2 border rounded"
              >
                <option value="">選択してください</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
              {errors.position && (
                <span className="text-red-500 text-sm">{errors.position.message}</span>
              )}
            </div>
          </section>

          {/* 連絡先情報セクション */}
          <section className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-4">連絡先情報</h2>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">メールアドレス*</label>
              <input
                type="email"
                {...register("email", { 
                  required: "メールアドレスは必須です",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "有効なメールアドレスを入力してください"
                  }
                })}
                className="w-full p-2 border rounded"
              />
              {errors.email && (
                <span className="text-red-500 text-sm">{errors.email.message}</span>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">電話番号*</label>
              <input
                type="tel"
                {...register("phoneNumber", { 
                  required: "電話番号は必須です",
                  pattern: {
                    value: /^0\d{9,10}$/,
                    message: "有効な電話番号を入力してください"
                  }
                })}
                className="w-full p-2 border rounded"
              />
              {errors.phoneNumber && (
                <span className="text-red-500 text-sm">{errors.phoneNumber.message}</span>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">パスワード*</label>
              <input
                type="password"
                {...register("password", { 
                  required: "パスワードは必須です",
                  minLength: {
                    value: 8,
                    message: "8文字以上で入力してください"
                  }
                })}
                className="w-full p-2 border rounded"
              />
              {errors.password && (
                <span className="text-red-500 text-sm">{errors.password.message}</span>
              )}
            </div>
          </section>

          {/* 追加情報セクション */}
          <section>
            <h2 className="text-lg font-semibold mb-4">追加情報</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">従業員数*</label>
                <input
                  type="number"
                  {...register("employeeCount", { 
                    required: "従業員数を入力してください",
                    min: 1
                  })}
                  className="w-full p-2 border rounded"
                />
                {errors.employeeCount && (
                  <span className="text-red-500 text-sm">{errors.employeeCount.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">国/地域*</label>
                <select
                  {...register("country", { required: "国を選択してください" })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">選択してください</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {errors.country && (
                  <span className="text-red-500 text-sm">{errors.country.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">言語*</label>
                <select
                  {...register("language", { required: "言語を選択してください" })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">選択してください</option>
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                {errors.language && (
                  <span className="text-red-500 text-sm">{errors.language.message}</span>
                )}
              </div>
            </div>
          </section>

          {error && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            新規登録
          </button>

          <div className="text-center mt-4">
            <span className="text-gray-600">既にアカウントをお持ちですか？</span>
            <Link href="/clients/login" className="text-blue-600 hover:underline ml-2">
              ログインページ
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Register
