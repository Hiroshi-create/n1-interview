"use client"

import type { Theme } from "@/stores/Theme"

interface ComponentProps {
  theme: Theme;
}

const SummaryContent = ({
    theme,
  }: ComponentProps): JSX.Element => {
    return (
        <div className="mt-4">
            <h2 className="text-2xl font-bold mb-4">インタビュー結果</h2>
            {theme.reportCreated ? (
                <p>レポートが正常に作成されました。</p>
            ) : (
                <>
                    {theme.collectInterviewsCount > 1 && theme.collectInterviewsCount >= theme.maximumNumberOfInterviews ? (
                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                            サマリーレポートを作成
                        </button>
                    ) : (
                        <p>まだインタビューが完了していません。</p>
                    )}
                </>
            )}
        </div>
    )
}

export default SummaryContent
