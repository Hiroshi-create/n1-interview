"use client";

import Image from 'next/image';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SquareCheck, AlertTriangle } from 'lucide-react';
import LoadingIcons from 'react-loading-icons';

interface LinkTextProps {
    children: React.ReactNode;
    href: string;
}

const InterviewDescription: React.FC<{
    interviewDuration: number | null;
    checkedItems1: { [key: string]: boolean };
    checkedItems2: { [key: string]: boolean };
    onCheckboxChange1: (id: string) => void;
    onCheckboxChange2: (id: string) => void;
}> = ({ interviewDuration, checkedItems1, checkedItems2, onCheckboxChange1, onCheckboxChange2 }) => {

    const CustomList = ({ ordered, children, ...props }: any) => {
        const listClass = ordered
          ? "list-decimal list-outside pl-8 text-left space-y-4"
          : "list-disc list-outside pl-8 text-left space-y-4 px-2";
        return <ul className={listClass} {...props}>{children}</ul>;
    };

    const CustomParagraph = ({ children, ...props }: any) => {
        return <p className="px-4" {...props}>{children}</p>;
    };

    const introText = `この度は、インタビューをお受けくださりありがとうございます。\n対話形式でのインタビューとなります。`

    const interviewNotes = [
        `所要時間は${interviewDuration ?? '未定'}分間程度です。最大${interviewDuration ? interviewDuration + 10 : '未定'}分ほどのお時間を確保ください。`,
        "静かな環境で、しっかり声を出せる環境で実施ください。",
        "撮影は行いませんので、服装は問いません。"
      ];

    const interviewSteps = [
        {
          title: "動作確認",
          description: `- AIが話す音声が聞こえるかの確認\n- 音声入力の確認\n- 準備ができたら、「開始」をクリック`,
          svgLogo: "/logo/logo_preparation.svg"
        },
        {
          title: "インタビュー",
          description: `- AIからの質問に回答\n- 人と話すように、できるだけ"具体的"に話します。`,
          svgLogo: "/logo/logo_interview.svg"
        },
        {
          title: "インタビュー終了",
          description: "右上のタイマーによって時間がなくなりますと、インタビューが終了され自動的にデータが保存されます。",
          svgLogo: "/logo/logo_completion.svg"
        }
    ];
    
    const descriptionText = `
## 実施ガイド

### インタビューの流れ

インタビューでは、あなたの経験や意見を詳しくお聞きします。率直かつ具体的な回答をお願いいたします。
質問の内容によっては、深掘りの質問をさせていただくこともあります。

### 回答方法について

自由回答と、選択回答があります。
    `;

    const howToAnswers = [
        {
          title: "自由回答",
          description: `
1. AIによって質問が話されたあと、画面中央下のマイクボタンを"一度だけ"クリック。
2. 人と話すように、できるだけ"具体的"に話します。（数分ほどであれば、お話いただいて問題ありません。）
3. もう一度、画面中央下の波形ボタンを"一度だけ"クリック。
これによって、AIが新たに回答の内容を理解した質問を聞きます。
          `,
          icon: AlertTriangle
        },
        {
          title: "選択回答",
          description: `
1. AIによって質問が話されたあと、選択可能なボタンが表示されます。
2. 回答となるボタンをクリックします。
これによって、AIが新たに回答の内容を理解した質問を聞きます。
          `,
          icon: SquareCheck
        },
    ];

    const importantPointsText = `
### 💡 インタビューがうまくいかない場合
> - 通信環境の良い場所で実施してください。
> - 古いパソコンや一部のデバイスでは、動作に問題が生じる可能性があります。その場合は別のパソコン等をお使いください。
> - 途中で中断すると、最初からやり直しになります。ご注意ください。

### ⚠️ 注意事項

> - 途中、お手洗い等のやむを得ない停止時は、右上のタイマーをクリックしてください。一時停止が可能です。復帰時にもう一度クリックすると再開できます。
> - 左のチャット画面に、質問と自分の回答が表示されます。誤字がありましたら、修正をお願いします。
`;

    const agreementText = `
## インタビューの準備を始めましょう
事前に以下の内容をご確認いただき、同意のうえお進みください。
    `;

    const agreementContentsText = `
> 特に重要な内容を記載しておりますので、最後までスクロールして全文を必ずご確認ください。

**❗️要配慮個人情報の取得**

当社は、本サービスを実施した結果、回答者様の要配慮個人情報（個人情報保護法第2項第3項に定める個人情報をいい、具体的には、ご本人の人種、信条、社会的身分、病歴、犯罪の経歴、犯罪により害を被った事実その他ご本人に対する不当な差別、偏見その他の不利益が生じないようにその取り扱いに特に配慮を要するものとして個人情報保護法施行令で定める記述等が含まれる個人情報を指します。）を取り扱う場合がございます。なお、当社は回答者さまから取得した要配慮個人情報を含む個人情報を当社のプライバシーポリシーに従い、適切かつ安全に管理します。
`;

    const LinkText: React.FC<LinkTextProps> = ({ children, href }) => (
        <span 
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => window.open(href, '_blank')}
        >
            {children}
        </span>
    );

    const checkBoxs = [
        {
            id: "agreement1",
            description: (
              <>
                本サービスご利用に関する
                <LinkText href="/terms/TermsOfService">利用規約</LinkText>
                および
                <LinkText href="/terms/PrivacyPolicy">プライバシーポリシー</LinkText>
                に同意します。
              </>
            ),
          },
        {
          id: "agreement2",
          description: "上記、「要配慮個人情報の取得」について熟読し、十分に理解しましたので、同意します。",
        },
    ];

    if (!interviewDuration) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <LoadingIcons.SpinningCircles className="w-12 h-12 text-primary" />
                <p className="mt-4 text-lg">データを読み込んでいます...</p>
            </div>
        );
    }

    return (
        <div className="prose max-w-none">
            <p className="mb-4">{introText}</p>
            <div className="flex flex-col mb-8">
                {interviewNotes.map((note, index) => (
                    <div key={index} className="bg-blue-100 rounded-lg p-4 mb-4 flex items-center max-w-xl w-full">
                        <i className="fas fa-check-circle text-green-500 mr-4">✔︎</i>
                        <p>{note}</p>
                    </div>
                ))}
            </div>
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                components={{
                    h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-blue-600 border-b-2 border-blue-300 pb-2" {...props} />,
                    h3: ({node, children, ...props}) => {
                        if (children === 'インタビューの流れ') {
                            return (
                                <>
                                    <h3 className="text-xl font-semibold mt-6 mb-3" {...props}>{children}</h3>
                                    <div className="flex flex-col md:flex-row justify-between mb-6">
                                    {interviewSteps.map((step, index) => (
                                        <div
                                            key={index} 
                                            className="flex flex-col items-center text-center p-3 mb-3 md:mb-0 md:mx-2 border bg-gray-100 border-gray-300 rounded-lg"
                                            style={{
                                            flex: '1 1 0',
                                            minWidth: '250px',
                                            }}
                                        >
                                            <Image
                                                src={step.svgLogo}
                                                alt={`${step.title} Logo`}
                                                width={300}
                                                height={300}
                                                className="select-none cursor-default mb-2"
                                                draggable="false"
                                                style={{ userSelect: "none" }}
                                            />
                                            <h4 className="font-bold text-lg md:text-xl">{index + 1}. {step.title}</h4>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    ol: CustomList,
                                                    ul: CustomList,
                                                    p: CustomParagraph
                                                }}
                                                className="text-left text-base leading-relaxed"
                                            >
                                                {step.description}
                                            </ReactMarkdown>
                                        </div>
                                        ))}
                                    </div>
                                </>
                            );
                        }
                        return <h3 className="text-xl font-semibold mt-6 mb-3" {...props}>{children}</h3>
                    },
                    h4: ({node, ...props}) => <h4 className="text-base font-medium mt-3 mb-1" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-4" {...props} />,
                    a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                }}
            >
                {descriptionText}
            </ReactMarkdown>
            {howToAnswers.map((howTo, index) => (
                <div key={index} className="mb-6 bg-blue-50 pl-4 pb-4 rounded-lg">
                    <div className="flex items-center">
                        <howTo.icon className="text-blue-700 mr-2" size={24} />
                        <h3 className="text-lg font-semibold text-text pt-4">{howTo.title}</h3>
                    </div>
                    <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        ol: ({ children }) => <ol className="list-decimal list-outside pl-8 space-y-2">{children}</ol>,
                        ul: ({ children }) => <ul className="list-disc list-outside pl-8 space-y-2">{children}</ul>,
                        li: ({ children }) => <li className="text-text">{children}</li>,
                    }}
                    className="text-left text-base leading-relaxed text-text"
                    >
                        {howTo.description}
                    </ReactMarkdown>
                </div>
            ))}
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-4 mb-3 text-red-400" {...props} />,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-yellow-500 pl-4 py-2 my-4 bg-yellow-50 text-text rounded-r-md">
                            {children}
                        </blockquote>
                    ),
                    p: ({ children }) => <p className="mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-6 my-2">{children}</ul>,
                    li: ({ children }) => <li className="mb-2">{children}</li>,
                }}
                className="text-left text-base leading-relaxed mb-6"
            >
                {importantPointsText}
            </ReactMarkdown>

            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-semibold mt-6 mb-3 text-blue-600 border-b-2 border-blue-300 pb-2" {...props} />
                    ),
                    blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-red-500 pl-4 py-2 my-4 bg-red-50 text-red-800">
                        {children}
                    </blockquote>
                    ),
                }}
                className="text-left text-base leading-relaxed pb-2"
            >
                {agreementText}
            </ReactMarkdown>

            <div className="bg-gray-100 rounded-lg p-6 mb-6 space-y-4">
                <div key={checkBoxs[0].id} className="flex items-center bg-white p-3 rounded shadow-sm">
                    <input
                        type="checkbox"
                        id={checkBoxs[0].id}
                        checked={checkedItems1[checkBoxs[0].id]}
                        onChange={() => onCheckboxChange1(checkBoxs[0].id)}
                        className="h-5 w-5 text-blue-600"
                    />
                    <label htmlFor={checkBoxs[0].id} className="ml-3 text-base">{checkBoxs[0].description}</label>
                </div>

                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                    h2: ({ node, ...props }) => (
                        <h2 className="text-xl font-semibold mt-6 mb-4 text-blue-600 border-b-2 border-blue-300 pb-2" {...props} />
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-red-500 pl-4 pt-3 pb-1 mb-4 bg-red-50 text-red-800 text-base rounded-r flex items-center">
                        <div>{children}</div>
                        </blockquote>
                    ),
                    strong: ({ children }) => {
                        if (children === '❗️要配慮個人情報の取得') {
                        return (
                            <strong className="text-black font-bold text-lg flex items-center mb-2">
                            <AlertTriangle className="text-red-600 mr-2" size={20} />
                            要配慮個人情報の取得
                            </strong>
                        );
                        }
                        return <strong>{children}</strong>;
                    },
                    p: ({ children }) => {
                        if (typeof children === 'string' && children.startsWith('当社は、')) {
                        return <p className="mt-2 px-2 text-black">{children}</p>;
                        }
                        return <p className="mb-2">{children}</p>;
                    }
                    }}
                    className="text-left text-base leading-relaxed p-4 bg-white rounded shadow-sm"
                >
                    {agreementContentsText}
                </ReactMarkdown>

                <div key={checkBoxs[1].id} className="flex items-center bg-white p-3 rounded shadow-sm">
                    <input
                        type="checkbox"
                        id={checkBoxs[1].id}
                        checked={checkedItems2[checkBoxs[1].id]}
                        onChange={() => onCheckboxChange2(checkBoxs[1].id)}
                        className="h-5 w-5 text-blue-600"
                    />
                    <label htmlFor={checkBoxs[1].id} className="ml-3 text-base">{checkBoxs[1].description}</label>
                </div>
            </div>
        </div>
    )
}

export default InterviewDescription;