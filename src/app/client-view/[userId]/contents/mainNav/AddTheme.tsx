"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppsContext } from '@/context/AppContext';
import LoadingIcons from 'react-loading-icons';

type FormData = {
  theme: string;
  isCustomer: boolean;
  isTest: boolean;
  duration: string;
  isPublic: boolean;
  deadlineDate: string;
  deadlineTime: string;
  maximumNumberOfInterviews: number;
};

const AddTheme = () => {
  const { userId } = useAppsContext();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      deadlineTime: '00:00',
      maximumNumberOfInterviews: 50
    }
  });
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [interviewUrl, setInterviewUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const onSubmit = async (data: FormData) => {
    if (data.theme && userId) {
      setIsLoading(true);
      try {
        const deadline = new Date(`${data.deadlineDate}T${data.deadlineTime}:00`);
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
            isPublic: isPublic,
            deadline: deadline.toISOString(),
            maximumNumberOfInterviews: data.maximumNumberOfInterviews
          }),
        });

        if (!response.ok) {
          throw new Error('APIリクエストが失敗しました');
        }

        const result = await response.json();
        setInterviewUrl(result.interviewUrl);
        setShowDialog(true);
        reset();
        setIsPublic(true);
      } catch (error) {
        console.error("テーマの追加中にエラーが発生しました:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(interviewUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000); // 3秒後に元に戻す
    });
  };

  return (
    <div className='bg-custom-blue p-4 rounded-md'>
      <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
        <fieldset disabled={isLoading}>
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

        <div className="flex items-center mb-2">
          <label htmlFor="deadlineDate" className="mr-2">募集締切日:</label>
          <input
            {...register("deadlineDate", { required: "募集締切日は必須です" })}
            type="date"
            className="p-2 rounded-md text-black border border-gray-300 mr-2"
          />
          <input
            {...register("deadlineTime")}
            type="time"
            className="p-2 rounded-md text-black border border-gray-300"
          />
        </div>
        {errors.deadlineDate && <span className='text-red-500 mb-2'>{errors.deadlineDate.message}</span>}

        <div className="flex items-center mb-2">
          <label htmlFor="maximumNumberOfInterviews" className="mr-2">最大インタビュー数:</label>
          <input
            {...register("maximumNumberOfInterviews", { 
              required: "最大インタビュー数は必須です",
              min: { value: 1, message: "1以上の数値を入力してください" }
            })}
            type="number"
            max="1000"
            min="1"
            className="p-2 rounded-md text-black border border-gray-300 w-20"
          />
        </div>
        {errors.maximumNumberOfInterviews && <span className='text-red-500 mb-2'>{errors.maximumNumberOfInterviews.message}</span>}

        <div className="flex items-center mb-4">
          <span className="mr-2">非公開</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={() => setIsPublic(!isPublic)}
            />
            <span className="slider round"></span>
          </label>
          <span className="ml-2">公開</span>
        </div>

        <button
            type="submit"
            className='bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'
            disabled={isLoading}
          >
            {isLoading ? <LoadingIcons.Oval className="w-5 h-5 mr-2" /> : null}
            テーマを追加
          </button>
        </fieldset>
      </form>
      
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">テーマが追加されました</h2>
            <p className="mb-4">以下のURLをコピーしてインタビュイーに共有してください：</p>
            <div className="flex items-center mb-4">
              <input
                type="text"
                value={interviewUrl}
                readOnly
                className="flex-grow p-2 border rounded-l-md"
              />
              <button
                onClick={copyToClipboard}
                className={`p-2 rounded-r-md transition-colors duration-300 ${
                  isCopied ? 'bg-green-500' : 'bg-blue-600'
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={isLoading}
              >
                {isCopied ? '✔︎完了' : 'コピー'}
              </button>
            </div>
            <button
              onClick={() => setShowDialog(false)}
              className="bg-gray-300 text-black py-2 px-4 rounded-md hover:bg-gray-400 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddTheme;