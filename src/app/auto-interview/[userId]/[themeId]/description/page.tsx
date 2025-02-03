"use client"

import React, { useState, useRef, useEffect } from 'react'
import { useAppsContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import LoadingIcons from 'react-loading-icons';
import InterviewDescription from '@/app/components/users/InterviewDescription';
import { getDoc, doc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../../firebase';

interface CreateInterviewResponse {
  success: boolean;
  interviewId: string;
  interviewRefPath: string;
  exists: boolean;
}

interface InitializeInterviewResponse {
  success: boolean;
  message: string;
  interviewCollected: boolean;
}

class ApplicationError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

class APIError extends ApplicationError {
  constructor(
    code: string,
    message: string,
    public details: { status: number; body: unknown }
  ) {
    super(code, message, details);
    this.name = 'APIError';
  }
}

const DescriptionDetail = () => {
  const router = useRouter();
  const {
    userId,
    selectThemeName,
    selectedThemeId,
    selectedThemeRef,
    setSelectedInterviewId,
    setSelectedInterviewRef,
    setIsOperationCheck,
    setIsMenuOpen,
    isInterviewCollected,
    setIsInterviewCollected,
    resetOperationCheckPhases,
    resetInterviewPhases
  } = useAppsContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [themeDuration, setThemeDuration] = useState<number | null>(null);
  const [checkedItems1, setCheckedItems1] = useState<{ [key: string]: boolean }>({});
  const [checkedItems2, setCheckedItems2] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchThemeDuration = async () => {
      if (selectedThemeRef) {
        try {
          const docSnap = await getDoc(selectedThemeRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && typeof data.interviewDurationMin === 'number') {
              setThemeDuration(data.interviewDurationMin);
            }
          }
        } catch (error) {
          console.error('Error fetching interview duration:', error);
          setError('テーマ情報の取得に失敗しました。ページを再読み込みしてください。');
        }
      }
    };

    fetchThemeDuration();
  }, [selectedThemeRef]);

  const handleCheckboxChange1 = (id: string) => {
    setCheckedItems1(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const handleCheckboxChange2 = (id: string) => {
    setCheckedItems2(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    resetInterviewPhases();
    setIsOperationCheck(false);
    setIsLoading(true);
    setError(null);
    
    const maxAttempts = 2;
    let attemptCount = 0;

    while (attemptCount < maxAttempts) {
      try {
        attemptCount++;

        if (!selectedThemeRef) {
          throw new ApplicationError(
            'INVALID_THEME_REFERENCE',
            'テーマの取得に失敗しました',
            { themeRef: selectedThemeRef }
          );
        }

        const controller = new AbortController();

        const createResponse = await fetch('/api/create_interview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': uuidv4(),
          },
          body: JSON.stringify({ intervieweeId: userId, themeRefPath: selectedThemeRef.path }),
          signal: controller.signal,
        });

        if (!createResponse.ok) {
          const errorBody = await createResponse.json().catch(() => ({}));
          throw new APIError(
            'INTERVIEW_CREATION_FAILED',
            `インタビューの作成に失敗しました (${createResponse.status})`,
            {
              status: createResponse.status,
              body: errorBody,
            }
          );
        }

        const createResult = await createResponse.json() as CreateInterviewResponse;
        const interviewRefPath = createResult.interviewRefPath;
        setSelectedInterviewRef(doc(db, interviewRefPath));
        setSelectedInterviewId(createResult.interviewId);

        if (!interviewRefPath) {
          throw new ApplicationError(
            'INVALID_INTERVIEW_REFERENCE',
            'インタビューの参照パスが取得できませんでした',
            { createResult }
          );
        }

        console.log(interviewRefPath);

        const initResponse = await fetch('/api/initialize_interview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': uuidv4(),
          },
          body: JSON.stringify({ interviewRefPath: interviewRefPath }),
          signal: controller.signal,
        });

        if (!initResponse.ok) {
          const errorBody = await initResponse.json().catch(() => ({}));
          throw new APIError(
            'INITIALIZATION_FAILED',
            `初期化処理に失敗しました (${initResponse.status})`,
            {
              status: initResponse.status,
              body: errorBody,
            }
          );
        }

        const result = await initResponse.json() as InitializeInterviewResponse;
        
        if (typeof result.interviewCollected !== 'boolean') {
          throw new TypeError(
            `Invalid interviewCollected type: ${JSON.stringify(result)}`
          );
        }

        setIsInterviewCollected(result.interviewCollected);

        router.push(`/auto-interview/${userId}/${selectedThemeId}/${createResult.interviewId}/interview`);
        return;

      } catch (error) {
        console.error(`Error [Attempt ${attemptCount}]:`, error);

        if (error instanceof APIError && error.details.status >= 500) {
          if (attemptCount === maxAttempts) {
            setError('サーバーエラーが発生しました。時間をおいて再度お試しください。');
          }
        } else if (error instanceof ApplicationError) {
          setError(getUserFriendlyErrorMessage(error));
          break;
        } else if (error instanceof TypeError) {
          setError('データ形式に問題がありました。管理者にお問い合わせください。');
          break;
        } else {
          setError('予期せぬエラーが発生しました。もう一度お試しください。');
          break;
        }
      }
    }

    setIsLoading(false);
  };

  const handleConfirmation = () => {
    setIsMenuOpen(false);
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

  const getUserFriendlyErrorMessage = (error: ApplicationError): string => {
    switch (error.code) {
      case 'INVALID_THEME_REFERENCE':
        return 'テーマ情報の取得に失敗しました。ページを再読み込みしてください。';
      case 'INTERVIEW_CREATION_FAILED':
        return 'インタビューの作成に失敗しました。もう一度お試しください。';
      case 'INVALID_INTERVIEW_REFERENCE':
        return 'インタビュー情報の取得に失敗しました。もう一度お試しください。';
      case 'INITIALIZATION_FAILED':
        return '初期化処理に失敗しました。時間をおいて再度お試しください。';
      case 'INVALID_ROUTE_PARAMETERS':
        return 'ページ情報が不足しています。ホームに戻って再度お試しください。';
      default:
        return '予期せぬエラーが発生しました。もう一度お試しください。';
    }
  };

  return (
    <div className="h-full flex flex-col p-4 mb-8">
      <h1 className="text-3xl text-text font-semibold mb-4">テーマ：{selectThemeName}</h1>
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p className="font-bold">エラー</p>
          <p>{error}</p>
        </div>
      )}
      {isInterviewCollected ? (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
          <p className="font-bold">回答済み</p>
          <p>このテーマについては既に回答済みです。ご協力ありがとうございました。</p>
        </div>
      ) : (
        <>
          <InterviewDescription
            interviewDuration={themeDuration}
            checkedItems1={checkedItems1}
            checkedItems2={checkedItems2}
            onCheckboxChange1={handleCheckboxChange1}
            onCheckboxChange2={handleCheckboxChange2}
          />
          {isLoading ? (
            <div className="mt-4 flex justify-center">
              <LoadingIcons.SpinningCircles />
            </div>
          ) : (
            <button 
              onClick={handleConfirmation} 
              disabled={!checkedItems1['agreement1'] || !checkedItems2['agreement2'] || isLoading}
              className={`mt-4 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-300 ${
                (!checkedItems1['agreement1'] || !checkedItems2['agreement2'] || isLoading) ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              動作確認に進む
            </button>
          )}
        </>
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
  );
}

export default DescriptionDetail;
