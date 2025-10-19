'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getTenantIdForDomain } from '@/context/lib/getTenantIdForDomain'
import { Header } from '@/context/components/ui/header/header'
import { useToast } from '@/context/ToastContext'
import { LoadingButton } from '@/context/components/ui/loading'
import { useFormValidation } from '@/context/hooks/useFormValidation'
import { FormField, PasswordField, SelectField } from '@/context/components/ui/form-field'
import { Card } from '@/context/components/ui/card'

interface FormValues {
    userNickname: string
    email: string
    password: string
    passwordConfirm: string
    gender: string
    birthYear: string
    birthMonthDay: string
}

const Register = () => {
    const router = useRouter();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const {
        values,
        errors,
        touched,
        isValid,
        handleChange,
        handleBlur,
        handleSubmit
    } = useFormValidation<FormValues>(
        {
            userNickname: '',
            email: '',
            password: '',
            passwordConfirm: '',
            gender: '',
            birthYear: '',
            birthMonthDay: ''
        },
        {
            userNickname: {
                required: 'ニックネームは必須です',
                minLength: { value: 2, message: '2文字以上入力してください' },
                maxLength: { value: 20, message: '20文字以内で入力してください' }
            },
            email: {
                required: 'メールアドレスは必須です',
                pattern: {
                    value: /^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}$/,
                    message: '有効なメールアドレスを入力してください'
                }
            },
            password: {
                required: 'パスワードは必須です',
                minLength: { value: 8, message: '8文字以上入力してください' },
                pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
                    message: '大文字・小文字・数字を含む8文字以上のパスワードを設定してください'
                }
            },
            passwordConfirm: {
                required: 'パスワード確認は必須です',
                custom: (value, formValues) => {
                    if (value !== formValues?.password) {
                        return 'パスワードが一致しません';
                    }
                    return true;
                }
            },
            gender: {
                required: '性別を選択してください'
            },
            birthYear: {
                required: '生年を入力してください',
                pattern: {
                    value: /^(19|20)\d{2}$/,
                    message: '有効な年を入力してください（例：1990）'
                },
                validate: (value) => {
                    const year = parseInt(value);
                    const currentYear = new Date().getFullYear();
                    if (year > currentYear || year < 1900) {
                        return '有効な年を入力してください';
                    }
                    if (currentYear - year < 13) {
                        return '13歳以上である必要があります';
                    }
                    return true;
                }
            },
            birthMonthDay: {
                required: '月日を入力してください',
                pattern: {
                    value: /^(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/,
                    message: '有効な月日を入力してください（例：0101）'
                }
            }
        },
        {
            mode: 'onChange',
            debounceTime: 500
        }
    );

    const onSubmit = async (formValues: FormValues) => {
        setIsLoading(true);
        try {
            const domain = formValues.email.split('@')[1];
            const tenantId = await getTenantIdForDomain(domain);
            
            if (tenantId) {
                toast.warning('登録制限', '組織に属している場合は、こちらから作成できません。組織の管理者へご連絡ください。');
                setIsLoading(false);
                return;
            }

            // 一般ユーザー用のテナントを指定
            const generalTenantId = process.env.NEXT_PUBLIC_FIREBASE_GENERAL_TENANT_ID;
            if (!generalTenantId) {
                toast.error('設定エラー', 'システム設定に問題があります。管理者にお問い合わせください。');
                setIsLoading(false);
                return;
            }
            auth.tenantId = generalTenantId;

            // Firebase Authenticationでユーザーを作成
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                formValues.email, 
                formValues.password
            );
            const user = userCredential.user;

            const response = await fetch('/api/auth/user_register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formValues.email,
                    password: formValues.password,
                    userNickname: formValues.userNickname,
                    gender: formValues.gender,
                    userBirthday: {
                        year: formValues.birthYear,
                        monthDay: formValues.birthMonthDay
                    },
                    userId: user.uid,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('token', result.token);
                toast.success('登録完了', 'ユーザー登録が完了しました。ログインページに移動します。');
                router.push("/users/login");
            } else {
                const errorData = await response.json();
                toast.error('登録エラー', errorData.message || 'ユーザー登録に失敗しました。');
            }
        } catch (error: any) {
            console.error('登録エラー:', error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error('登録エラー', 'このメールアドレスは既に使用されています。');
            } else if (error.code === 'auth/weak-password') {
                toast.error('登録エラー', 'パスワードは8文字以上で設定してください。');
            } else if (error.code === 'auth/invalid-email') {
                toast.error('登録エラー', 'メールアドレスの形式が正しくありません。');
            } else {
                toast.error('登録エラー', '登録処理中にエラーが発生しました。');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const genderOptions = [
        { value: 'male', label: '男性' },
        { value: 'female', label: '女性' },
        { value: 'other', label: 'その他' },
        { value: 'not_specified', label: '未回答' }
    ];

    // フォームの完成度を計算
    const getFormProgress = () => {
        const fields = ['userNickname', 'email', 'password', 'passwordConfirm', 'gender', 'birthYear', 'birthMonthDay'];
        const filledFields = fields.filter(field => values[field as keyof FormValues]);
        return Math.round((filledFields.length / fields.length) * 100);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
            <Header 
                className="h-14 bg-white shadow-sm flex flex-row items-center justify-between z-10"
                handleLogoClickPath={`/home`}
            />

            <div className='flex-grow flex flex-col items-center justify-center py-8'>
                <Card className='bg-white p-8 rounded-xl shadow-xl w-full max-w-md'>
                    <div className="mb-6">
                        <h1 className='text-3xl font-bold text-gray-800 mb-2'>新規登録</h1>
                        <p className="text-sm text-gray-600">
                            アカウントを作成して、サービスを利用開始しましょう
                        </p>
                        
                        {/* 進捗バー */}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>入力進捗</span>
                                <span>{getFormProgress()}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${getFormProgress()}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            label="ニックネーム"
                            name="userNickname"
                            value={values.userNickname}
                            error={errors.userNickname}
                            touched={touched.userNickname}
                            required
                            placeholder="山田太郎"
                            onChange={handleChange('userNickname')}
                            onBlur={handleBlur('userNickname')}
                            helpText="2〜20文字で入力してください"
                        />

                        <FormField
                            label="メールアドレス"
                            name="email"
                            type="email"
                            value={values.email}
                            error={errors.email}
                            touched={touched.email}
                            required
                            placeholder="example@email.com"
                            onChange={handleChange('email')}
                            onBlur={handleBlur('email')}
                        />

                        <PasswordField
                            label="パスワード"
                            name="password"
                            value={values.password}
                            error={errors.password}
                            touched={touched.password}
                            required
                            placeholder="8文字以上のパスワード"
                            onChange={handleChange('password')}
                            onBlur={handleBlur('password')}
                            showStrength={true}
                        />

                        <FormField
                            label="パスワード（確認）"
                            name="passwordConfirm"
                            type="password"
                            value={values.passwordConfirm}
                            error={errors.passwordConfirm}
                            touched={touched.passwordConfirm}
                            required
                            placeholder="パスワードを再入力"
                            onChange={handleChange('passwordConfirm')}
                            onBlur={handleBlur('passwordConfirm')}
                            showSuccessIcon={values.password === values.passwordConfirm && values.passwordConfirm !== ''}
                        />

                        <SelectField
                            label="性別"
                            name="gender"
                            value={values.gender}
                            options={genderOptions}
                            error={errors.gender}
                            touched={touched.gender}
                            required
                            onChange={(value) => handleChange('gender')({ target: { value } } as any)}
                            onBlur={handleBlur('gender')}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                label="生年"
                                name="birthYear"
                                value={values.birthYear}
                                error={errors.birthYear}
                                touched={touched.birthYear}
                                required
                                placeholder="1990"
                                onChange={handleChange('birthYear')}
                                onBlur={handleBlur('birthYear')}
                            />

                            <FormField
                                label="月日"
                                name="birthMonthDay"
                                value={values.birthMonthDay}
                                error={errors.birthMonthDay}
                                touched={touched.birthMonthDay}
                                required
                                placeholder="0101"
                                onChange={handleChange('birthMonthDay')}
                                onBlur={handleBlur('birthMonthDay')}
                            />
                        </div>

                        <div className="pt-4">
                            <LoadingButton
                                type='submit'
                                loading={isLoading}
                                loadingText="登録中..."
                                disabled={!isValid || isLoading}
                                className='w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                新規登録
                            </LoadingButton>
                        </div>

                        <div className='text-center pt-4 border-t'>
                            <span className='text-gray-600 text-sm'>
                                既にアカウントをお持ちですか？
                            </span>
                            <Link href="/users/login" className='text-blue-600 text-sm font-semibold ml-1 hover:text-blue-700'>
                                ログインページへ
                            </Link>
                        </div>
                    </form>
                </Card>

                {/* 利用規約等 */}
                <div className="mt-6 text-center text-xs text-gray-600 max-w-md">
                    登録することで、
                    <Link href="/terms/TermsOfService" className="text-blue-600 hover:underline">利用規約</Link>
                    と
                    <Link href="/terms/PrivacyPolicy" className="text-blue-600 hover:underline">プライバシーポリシー</Link>
                    に同意したものとみなされます。
                </div>
            </div>
        </div>
    )
}

export default Register