"use client"

import type { Theme } from "@/stores/Theme"
import { format } from 'date-fns'

interface ComponentProps {
  theme: Theme;
}

const DetailsContent = ({
    theme,
}: ComponentProps): JSX.Element => {
    const formatDate = (date: any) => {
        if (date && typeof date.toDate === 'function') {
            return format(date.toDate(), 'yyyy年MM月dd日 HH:mm')
        }
        return '未設定'
    }

    return (
        <div className="mt-8 p-8 bg-white rounded-xl">
            <h2 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">インタビュー詳細</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {[
                    { label: 'テーマID', value: theme.themeId },
                    { label: 'テーマ', value: theme.theme },
                    { label: '作成者ID', value: theme.createUserId },
                    { label: '作成日時', value: formatDate(theme.createdAt) },
                    { label: '締切日', value: formatDate(theme.deadline) },
                    { label: 'クライアントID', value: theme.clientId },
                    { label: 'リクエストされたインタビュー数', value: theme.interviewsRequestedCount },
                    { label: '収集されたインタビュー数', value: theme.collectInterviewsCount },
                    { label: 'インタビュー時間（分）', value: theme.interviewDurationMin },
                    { label: '公開状態', value: theme.isPublic ? '公開' : '非公開' },
                    { label: '最大インタビュー数', value: theme.maximumNumberOfInterviews },
                    { label: 'インタビュー回答URL', value: theme.interviewResponseURL || '未設定' },
                    { label: 'レポート作成状況', value: theme.reportCreated ? '作成済み' : '未作成' },
                ].map((item, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg transition-all duration-300 hover:shadow-md">
                        <p className="text-sm font-medium text-gray-500 mb-2">{item.label}</p>
                        <p className="text-lg text-gray-900 font-semibold">{item.value}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default DetailsContent;
