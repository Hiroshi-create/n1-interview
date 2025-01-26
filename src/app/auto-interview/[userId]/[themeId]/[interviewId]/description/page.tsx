"use client"

import React, { useState, useRef, useEffect } from 'react'
import { useAppsContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import LoadingIcons from 'react-loading-icons';
import InterviewDescription from '@/app/components/users/InterviewDescription';

const DescriptionDetail = () => {
  const {
    userId,
    selectThemeName,
    selectedThemeId,
    selectedInterviewId,
    selectedInterviewRef,
    resetOperationCheckPhases,
    resetInterviewPhases  // 仮
  } = useAppsContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialogRef.current) {
      if (showConfirmation) {
        dialogRef.current.showModal();
      } else {
        dialogRef.current.close();
      }
    }
  }, [showConfirmation]);

  const handleStartClick = async () => {
    resetOperationCheckPhases();
    resetInterviewPhases();  // 仮
    setIsLoading(true);
    
    try {
      if (!selectedInterviewRef) {
        throw new Error('インタビューが選択されていません');
      }
  
      const response = await fetch('/api/clean_operation_messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interviewRefPath: selectedInterviewRef.path }),
      });
  
      if (!response.ok) {
        throw new Error('operation_checkメッセージの削除に失敗しました');
      }
  
      const result = await response.json();
      console.log(result.message);
  
      // メッセージ削除成功後にインタビューページに遷移
      router.push(`/auto-interview/${userId}/${selectedThemeId}/${selectedInterviewId}/interview`);
    } catch (error) {
      console.error('エラー:', error);
      // エラーが発生した場合でもユーザーに通知した上でインタビューページに遷移
      alert('メッセージの削除中にエラーが発生しましたが、インタビューを開始します。');
      router.push(`/auto-interview/${userId}/${selectedThemeId}/${selectedInterviewId}/interview`);
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleConfirmation = () => {
    setShowConfirmation(true);
  };

  const handleConfirmationResponse = (response: string) => {
    if (response === 'yes') {
      handleStartClick();
    }
    setShowConfirmation(false);
  };

  const handleDialogClose = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialogDimensions = dialogRef.current?.getBoundingClientRect();
    if (
      dialogDimensions &&
      (event.clientX < dialogDimensions.left ||
        event.clientX > dialogDimensions.right ||
        event.clientY < dialogDimensions.top ||
        event.clientY > dialogDimensions.bottom)
    ) {
      handleConfirmationResponse('no');
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <h1 className="text-2xl text-white font-semibold mb-4">{selectThemeName}</h1>
      <InterviewDescription />
      {isLoading ? (
        <div className="mt-4 flex justify-center">
          <LoadingIcons.SpinningCircles />
        </div>
      ) : (
        <button 
          onClick={handleConfirmation} 
          className="mt-4 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-300"
        >
          開始
        </button>
      )}

      <dialog 
        ref={dialogRef} 
        className="p-6 rounded-xl shadow-2xl bg-white max-w-md w-full"
        onClick={handleDialogClose}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">環境確認</h2>
          <p className="text-lg mb-6 text-gray-600">周りは静かで、声を出せる環境ですか？</p>
          <div className="flex justify-between space-x-4">
            <button 
              onClick={() => handleConfirmationResponse('no')} 
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-300"
            >
              まだです
            </button>
            <button 
              onClick={() => handleConfirmationResponse('yes')} 
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-300"
            >
              はい
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}

export default DescriptionDetail
