"use client";

import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAppsContext } from '@/context/AppContext';
import LoadingIcons from 'react-loading-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/context/components/ui/card';
import { Label } from '@/context/components/ui/label';
import { Input } from '@/context/components/ui/input';
import { Switch } from '@/context/components/ui/switch';
import { Separator } from '@/context/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/context/components/ui/select';
import { Button } from '@/context/components/ui/button';

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
  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      deadlineTime: '00:00',
      maximumNumberOfInterviews: 50,
      duration: '' // デフォルト値を空文字列に設定
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
        const response = await fetch('/api/create_theme', {
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
    <div>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>新しいテーマを追加</CardTitle>
          <CardDescription>インタビューのテーマと設定を入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <fieldset disabled={isLoading}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="theme">テーマ</Label>
                  <Input
                    {...register("theme", { required: "テーマは必須です" })}
                    id="theme"
                    type="text"
                    placeholder="新しいテーマを入力"
                  />
                  {errors.theme && <p className="text-red-500 text-sm mt-1">{errors.theme.message}</p>}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="isTest">テスト</Label>
                    <Switch {...register("isTest")} id="isTest" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>社内</span>
                    <Switch {...register("isCustomer")} />
                    <span>顧客</span>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">インタビュー時間</Label>
                  <Controller
                    name="duration"
                    control={control}
                    rules={{ required: "インタビュー時間は必須です" }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30分</SelectItem>
                          <SelectItem value="60">60分</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>}
                </div>
                  <div>
                    <Label htmlFor="maximumNumberOfInterviews">最大インタビュー数</Label>
                    <Input
                      {...register("maximumNumberOfInterviews", { 
                        required: "最大インタビュー数は必須です",
                        min: { value: 1, message: "1以上の数値を入力してください" }
                      })}
                      type="number"
                      max="1000"
                      min="1"
                    />
                    {errors.maximumNumberOfInterviews && <p className="text-red-500 text-sm mt-1">{errors.maximumNumberOfInterviews.message}</p>}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="deadlineDate">募集締切</Label>
                  <div className="flex space-x-2">
                    <Input
                      {...register("deadlineDate", { required: "募集締切日は必須です" })}
                      type="date"
                    />
                    <Input
                      {...register("deadlineTime")}
                      type="time"
                    />
                  </div>
                  {errors.deadlineDate && <p className="text-red-500 text-sm mt-1">{errors.deadlineDate.message}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isPublic">公開設定</Label>
                  <div className="flex items-center space-x-2">
                    <span>{isPublic ? '公開' : '非公開'}</span>
                    <Switch
                      id="isPublic"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={isLoading}
              >
                {isLoading ? <LoadingIcons.Oval className="w-5 h-5 mr-2" /> : null}
                テーマを追加
              </Button>
            </fieldset>
          </form>
        </CardContent>
      </Card>
      
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