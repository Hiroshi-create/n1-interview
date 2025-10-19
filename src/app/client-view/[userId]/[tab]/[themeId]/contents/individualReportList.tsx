import { useAppsContext } from "@/context/AppContext";
import { IndividualReport } from "@/stores/IndividualReport";
import { Theme } from "@/stores/Theme";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LoadingIcons from "react-loading-icons";
import { RefreshCw, FileText, AlertCircle, CheckCircle } from "lucide-react";

interface ComponentProps {
    individualReports: IndividualReport[];
    interviewIds: string[];
    theme: Theme;
    temporaryIds: (string | null)[];
    confirmedUserIds: string[];
    interviewData?: any[]; // インタビューの詳細データ
    onReportGenerate?: (interviewId: string) => Promise<void>; // レポート生成コールバック
}

const IndividualReportList = ({
    individualReports,
    interviewIds,
    theme,
    temporaryIds,
    confirmedUserIds,
    interviewData = [],
    onReportGenerate
}: ComponentProps): JSX.Element => {
    const router = useRouter();
    const { userId, setSelectedInterviewId } = useAppsContext();
    const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set());
    const [generationErrors, setGenerationErrors] = useState<Map<string, string>>(new Map());

    const selectIndividualReport = (individualReportId: string, themeId: string, index: number) => {
        setSelectedInterviewId(interviewIds[index]);
        router.push(`/client-view/${userId}/Report/${themeId}/${individualReportId}`);
    }

    const handleGenerateReport = async (interviewId: string, index: number) => {
        if (generatingReports.has(interviewId)) return;

        setGeneratingReports(prev => new Set([...prev, interviewId]));
        setGenerationErrors(prev => {
            const newMap = new Map(prev);
            newMap.delete(interviewId);
            return newMap;
        });

        try {
            // インタビューパスを構築
            const interviewRefPath = `themes/${theme.themeId}/interviews/${interviewId}`;
            
            // レポート生成APIを呼び出し
            const response = await fetch('/api/report/individualReport', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    theme: theme.theme,
                    interviewRefPath: interviewRefPath,
                    forceRegenerate: false,
                    useGPT4: false
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'レポート生成に失敗しました');
            }

            const result = await response.json();
            
            // 成功したらコールバックを呼び出し（親コンポーネントでリロード）
            if (onReportGenerate) {
                await onReportGenerate(interviewId);
            }
        } catch (error) {
            console.error('レポート生成エラー:', error);
            setGenerationErrors(prev => {
                const newMap = new Map(prev);
                newMap.set(interviewId, (error as Error).message);
                return newMap;
            });
        } finally {
            setGeneratingReports(prev => {
                const newSet = new Set(prev);
                newSet.delete(interviewId);
                return newSet;
            });
        }
    };

    // インタビューが完了しているがレポートがない項目を検出
    const getMissingReports = () => {
        const missing: { interviewId: string; index: number }[] = [];
        
        interviewIds.forEach((interviewId, index) => {
            const hasReport = individualReports[index] !== undefined && individualReports[index] !== null;
            const interviewInfo = interviewData[index];
            const isCollected = interviewInfo?.interviewCollected === true;
            
            if (isCollected && !hasReport) {
                missing.push({ interviewId, index });
            }
        });
        
        return missing;
    };

    const missingReports = getMissingReports();

    return (
        <div className="space-y-2">
            {/* 未生成レポートの通知 */}
            {missingReports.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                        <div className="flex-1">
                            <p className="text-sm text-yellow-700">
                                {missingReports.length}件のインタビューでレポートが未生成です
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <ul className="">
                {interviewIds.map((interviewId, index) => {
                    const report = individualReports[index];
                    const hasReport = report !== undefined && report !== null;
                    const isGenerating = generatingReports.has(interviewId);
                    const hasError = generationErrors.has(interviewId);
                    const errorMessage = generationErrors.get(interviewId);
                    const interviewInfo = interviewData[index];
                    const isCollected = interviewInfo?.interviewCollected === true;

                    return (
                        <li 
                            key={interviewId}
                            className='border-b border-gray-300 p-4 transition-colors duration-300'
                        >
                            <div className="flex items-center justify-between">
                                <div 
                                    className={`flex-1 ${hasReport ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                                    onClick={() => {
                                        if (hasReport && report) {
                                            selectIndividualReport(
                                                report.individualReportId,
                                                theme.themeId,
                                                index
                                            );
                                        }
                                    }}
                                >
                                    <div className="flex items-center space-x-2">
                                        {hasReport ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : isCollected ? (
                                            <FileText className="h-4 w-4 text-gray-400" />
                                        ) : (
                                            <div className="h-4 w-4" />
                                        )}
                                        <span className="text-gray-800">
                                            {hasReport ? `レポート ${index + 1}` : `インタビュー ${index + 1}`}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1 ml-6">
                                        {temporaryIds[index] 
                                            ? `ワンタイムコード：${temporaryIds[index]}`
                                            : confirmedUserIds[index]
                                            ? "確認済み ✔️"
                                            : "未確認"}
                                        {!hasReport && isCollected && (
                                            <span className="ml-2 text-orange-600">
                                                (レポート未生成)
                                            </span>
                                        )}
                                    </div>
                                    {hasError && (
                                        <div className="text-sm text-red-600 mt-1 ml-6">
                                            エラー: {errorMessage}
                                        </div>
                                    )}
                                </div>

                                {/* レポート生成ボタン */}
                                {!hasReport && isCollected && (
                                    <button
                                        onClick={() => handleGenerateReport(interviewId, index)}
                                        disabled={isGenerating}
                                        className={`
                                            ml-4 px-3 py-1 rounded-md text-sm font-medium
                                            transition-all duration-200
                                            ${isGenerating 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'}
                                        `}
                                        title="レポートを生成"
                                    >
                                        {isGenerating ? (
                                            <div className="flex items-center space-x-1">
                                                <LoadingIcons.Oval 
                                                    stroke="#9CA3AF" 
                                                    strokeOpacity={1} 
                                                    speed={0.75} 
                                                    width={16} 
                                                    height={16}
                                                />
                                                <span>生成中...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-1">
                                                <RefreshCw className="h-4 w-4" />
                                                <span>レポート生成</span>
                                            </div>
                                        )}
                                    </button>
                                )}

                                {/* 再生成ボタン（既存レポートがある場合） */}
                                {hasReport && (
                                    <button
                                        onClick={() => handleGenerateReport(interviewId, index)}
                                        disabled={isGenerating}
                                        className={`
                                            ml-4 p-1 rounded-md
                                            transition-all duration-200
                                            ${isGenerating 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
                                        `}
                                        title="レポートを再生成"
                                    >
                                        {isGenerating ? (
                                            <LoadingIcons.Oval 
                                                stroke="#9CA3AF" 
                                                strokeOpacity={1} 
                                                speed={0.75} 
                                                width={16} 
                                                height={16}
                                            />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* 一括生成ボタン（未生成レポートが複数ある場合） */}
            {missingReports.length > 1 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <button
                        onClick={async () => {
                            for (const { interviewId, index } of missingReports) {
                                await handleGenerateReport(interviewId, index);
                            }
                        }}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                        すべての未生成レポートを生成（{missingReports.length}件）
                    </button>
                </div>
            )}
        </div>
    );
};

export default IndividualReportList;