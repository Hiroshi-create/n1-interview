"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, DocumentReference, getDoc } from "firebase/firestore";
import { db } from "../../../../../../../firebase";
import { Theme } from "@/stores/Theme";
import { IndividualReport } from "@/stores/IndividualReport";
import LoadingIcons from "react-loading-icons";
import { useAppsContext } from "@/context/AppContext";
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SubmitHandler, useForm } from "react-hook-form";

type Inputs = {
    email: string
    password: string
}

const components: Components = {
  h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-6 mb-3" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-4 mb-2" {...props} />,
  h4: ({node, ...props}) => <h4 className="text-base font-medium mt-3 mb-1" {...props} />,
  p: ({node, ...props}) => <p className="mb-4" {...props} />,
  ul: ({node, ...props}) => (
    <ul className="list-disc list-outside space-y-1 pl-6 ml-4" {...props} />
  ),
  ol: ({node, ...props}) => (
    <ol className="list-decimal list-outside space-y-1 pl-6 ml-4" {...props} />
  ),
  li: ({node, ...props}) => {
    type ListNode = {
      parent?: {
        type?: string;
        parent?: {
          type?: string;
        };
      };
    };
  
    if (!node) return <li {...props} />;
    const safeNode = node as unknown as ListNode;
  
    const calculateNestLevel = (currentNode: ListNode, level = 0): number => {
      if (!currentNode.parent?.parent?.type) return level;
      return calculateNestLevel(
        { parent: currentNode.parent.parent } as ListNode, 
        level + 1
      );
    };
  
    const nestLevel = Math.min(calculateNestLevel(safeNode), 3);
    const isOrderedList = safeNode.parent?.type === 'ol';

    return (
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-2 mb-2">
          {!isOrderedList && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400"
              style={{
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1'][nestLevel - 1] || '#121212'
              }}
            />
          )}
        </div>
        <div className="flex-1 pb-2">{props.children}</div>
      </div>
    );
  },
  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-4" {...props} />,
  a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
  img: ({node, ...props}) => (
    <img 
      className="my-6 mx-auto max-w-full h-auto rounded-xl shadow-lg transition-transform duration-300 hover:scale-105"
      loading="lazy"
      {...props}
    />
  ),
  table: ({node, ...props}) => (
    <div className="overflow-x-auto my-8">
      <table className="min-w-full border-collapse bg-white shadow-md rounded-lg" {...props} />
    </div>
  ),
  thead: ({node, ...props}) => (
    <thead className="bg-gray-100" {...props} />
  ),
  tr: ({node, ...props}) => (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150" {...props} />
  ),
  td: ({node, ...props}) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" {...props} />
  ),
  th: ({node, ...props}) => (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />
  ),
  hr: ({node, ...props}) => (
    <hr className="my-12 border-t-2 border-gray-200 w-1/2 mx-auto" {...props} />
  ),
  strong: ({node, ...props}) => (
    <strong 
      className="flex font-semibold text-[#3A506B] pl-4 ml-[-16px]"
      style={{
        lineHeight: '1.8',
        display: 'block',
        position: 'relative'
      }}
      {...props}
    />
  ),
  em: ({node, ...props}) => (
    <em className="italic text-gray-600 bg-gray-100 px-2 py-1 rounded" {...props} />
  ),
}

const IndividualReportDetailPage = () => {
  const { selectedInterviewId } = useAppsContext();
  const params = useParams();
  const router = useRouter();

  const [theme, setTheme] = useState<Theme | null>(null);
  const [individualReport, setIndividualReport] = useState<IndividualReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [temporaryId, setTemporaryId] = useState<string>("ワンタイムコード取得中...");
  const [fullName, setFullName] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [interviewRef, setInterviewRef] = useState<DocumentReference | null>(null);
  const [confirmedUserId, setConfirmedUserId] = useState<string | null>(null);

  const {
      register,
      handleSubmit,
      formState: { errors },
  } = useForm<Inputs>();

  const tab = params.tab as string;
  const themeId = params.themeId as string;
  const individualReportId = params.individualReportId as string;

  useEffect(() => {
    const fetchData = async () => {
        if (themeId && selectedInterviewId) {
            const themeRef = doc(db, "themes", themeId);
            const themeSnap = await getDoc(themeRef);
            if (themeSnap.exists()) {
                setTheme(themeSnap.data() as Theme);
            }

            const interviewRef = doc(db, "themes", themeId, "interviews", selectedInterviewId);
            setInterviewRef(interviewRef);
            const interviewSnap = await getDoc(interviewRef);
            if (interviewSnap.exists()) {
                setTemporaryId(interviewSnap.data().temporaryId as string);
                setConfirmedUserId(interviewSnap.data().confirmedUserId as string | null);
            }
            const individualReportRef = doc(interviewRef, "individualReport", individualReportId);
            const individualReportSnap = await getDoc(individualReportRef);
            if (individualReportSnap.exists()) {
                setIndividualReport(individualReportSnap.data() as IndividualReport);
            }
            console.log("report : " + individualReport?.report)

            setIsLoading(false);
        }
    };
    fetchData();
  }, [themeId, selectedInterviewId, individualReportId]);

  const reauthorizeUser: SubmitHandler<Inputs> = async (data) => {
    try {
        if (!interviewRef) {
            throw new Error('インタビュー参照が見つかりません');
        }
        const response = await fetch('/api/reauthenticate', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: data.email,
                password: data.password,
                interviewRefPath: interviewRef.path,
                temporaryId: temporaryId,
            }),
        });
  
        const result = await response.json();
    
        if (!response.ok) {
            throw new Error(result.error || '認証に失敗しました');
        }
    
        console.log("ユーザーの再認証に成功しました");
        // 認証成功時の処理を追加
        setIsConfirmed(true);
        setConfirmedUserId(result.userId); // サーバーから返されたユーザーIDをセット
        return true;
    } catch (error) {
        console.error("再認証エラー:", error);
        alert(error instanceof Error ? error.message : '予期せぬエラーが発生しました');
        return false;
    }
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-64">
            <LoadingIcons.SpinningCircles className="w-12 h-12 text-primary" />
            <p className="mt-4 text-lg">データを読み込んでいます...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-text">
      <div className="flex items-center gap-2 border-b border-secondary px-4 py-3">
        <h1 className="text-xl font-semibold">
          <span
            className="cursor-pointer hover:text-primary transition-colors duration-300"
            onClick={() => router.push(`/client-view/${params.userId}/${tab}`)}
          >
            {tab}
          </span>
          &nbsp;＞&nbsp;
          <span
            className="cursor-pointer hover:text-primary transition-colors duration-300"
            onClick={() => router.push(`/client-view/${params.userId}/${tab}/${themeId}`)}
          >
            {theme?.theme || "テーマ名"}
          </span>
          &nbsp;＞&nbsp;{individualReportId}
        </h1>
      </div>
      <main className="container mx-auto px-4 py-6 pt-8 flex-grow">
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 my-12">
          {individualReport ? (
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold mb-6 text-secondary">レポート内容</h2>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                components={components}
              >
                {individualReport.report}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-text text-center text-lg font-semibold">レポートが見つかりません</p>
          )}
        </div>
          {/* 確認済みの場合の表示を修正 */}
          {confirmedUserId || isConfirmed ? (
            <div className="bg-green-100 rounded-3xl shadow-lg p-10 border border-green-200 my-12 max-w-3xl mx-auto text-center">
              <svg
                className="w-24 h-24 text-green-500 mx-auto mb-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-4xl font-bold mb-4 text-green-700">確認済み</h2>
              <p className="text-xl text-green-600">このインタビューは既に確認済みです。</p>
            </div>
          ) : temporaryId ? (
            // 確認プロセス用フォームの描画
            <div className="bg-white rounded-3xl shadow-lg p-10 border border-gray-200 my-12 max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold mb-8 text-secondary text-center">回答の完了承認</h2>
                <p className="mb-6 text-lg text-center text-gray-700">この確認によって、組織による確認が完了したものとします</p>
                
                <form
                    onSubmit={handleSubmit(reauthorizeUser)}
                    className='space-y-8'
                >
                    <div className="bg-gray-100 p-4 rounded-lg mb-8">
                        <p className="text-center">
                            <span className="text-gray-600">一時ID：</span>
                            <span className="font-semibold text-lg">{temporaryId}</span>
                        </p>
                    </div>

                    <div>
                        <label htmlFor="fullName" className="block text-lg font-medium text-gray-700 mb-2">確認者フルネーム</label>
                        <input
                            type="text"
                            id="fullName"
                            className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="フルネームを入力してください"
                        />
                    </div>

                    <div>
                        <label className='block text-lg font-medium text-gray-700 mb-2'>
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
                            className='w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            placeholder="example@example.com"
                        />
                        {errors.email && <span className='text-red-600 text-sm mt-1 block'>{errors.email.message}</span>}
                    </div>

                    <div>
                        <label className='block text-lg font-medium text-gray-700 mb-2'>
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
                            className='w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            placeholder="••••••••"
                        />
                        {errors.password && <span className='text-red-600 text-sm mt-1 block'>{errors.password.message}</span>}
                    </div>

                    <div className='flex justify-center'>
                        <button
                        type='submit'
                        className='bg-blue-600 text-white font-bold py-4 px-8 rounded-lg hover:bg-blue-700 transition duration-300 w-full max-w-md text-lg shadow-md hover:shadow-lg transform hover:-translate-y-1'>
                            確認する
                        </button>
                    </div>
                </form>
            </div>
        ) : (
          // 確認情報が見つからない場合の描画
          <div className="bg-yellow-100 rounded-3xl shadow-lg p-10 border border-yellow-200 my-12 max-w-3xl mx-auto text-center">
              <p className="text-xl text-yellow-700">確認情報が見つかりません。</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default IndividualReportDetailPage;