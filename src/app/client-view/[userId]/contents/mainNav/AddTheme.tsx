"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { useAppsContext } from '@/context/AppContext';

type FormData = {
  theme: string;
  isCustomer: boolean;
  isTest: boolean;
  duration: string;
};

const AddTheme = () => {
  const { userId } = useAppsContext();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    if (data.theme && userId) {
      try {
        const response = await fetch('/api/create_interview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme: data.theme,
            isCustomer: data.isCustomer,
            isTest: data.isTest,
            userId: userId,
            duration: parseInt(data.duration),
          }),
        });

        if (!response.ok) {
          throw new Error('APIリクエストが失敗しました');
        }

        reset();
      } catch (error) {
        console.error("テーマの追加中にエラーが発生しました:", error);
      }
    }
  };

  return (
    <div className='bg-custom-blue p-4 rounded-md'>
      <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
        <input
          {...register("theme", { required: "テーマは必須です" })}
          id="theme"
          type="text"
          placeholder="新しいテーマを入力"
          className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-300 ease-in-out"
        />
        {errors.theme && <span className='text-red-500 mb-2'>{errors.theme.message}</span>}

        <div className="flex items-center mb-2">
          <label className="toggle-switch mr-2">
            <input type="checkbox" {...register("isTest")} />
            <span className="slider round"></span>
          </label>
          <span>テスト</span>
        </div>

        <div className="flex items-center mb-2">
          <span className="mr-2">社内</span>
          <label className="toggle-switch">
            <input type="checkbox" {...register("isCustomer")} />
            <span className="slider round"></span>
          </label>
          <span className="ml-2">顧客</span>
        </div>

        <div className="flex items-center mb-2">
          <label htmlFor="duration" className="mr-2">インタビュー時間:</label>
          <select
            {...register("duration", { required: "インタビュー時間は必須です" })}
            className="p-2 rounded-md text-black border border-gray-300"
          >
            <option value="30">30分</option>
            <option value="60">60分</option>
          </select>
        </div>
        {errors.duration && <span className='text-red-500 mb-2'>{errors.duration.message}</span>}

        <button
          type="submit"
          className='bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300'
        >
          テーマを追加
        </button>
      </form>
    </div>
  );
};

export default AddTheme;
