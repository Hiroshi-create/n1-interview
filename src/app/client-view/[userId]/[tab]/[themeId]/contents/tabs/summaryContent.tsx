"use client"

import { useState, useEffect } from 'react';
import type { Theme } from "@/stores/Theme"
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Components } from 'react-markdown/lib';
import { collection, doc, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingIcons from 'react-loading-icons';
import { FileText, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { LoadingButton, Skeleton } from '@/context/components/ui/loading';

interface ComponentProps {
  theme: Theme;
}

interface SummaryReport {
  summaryReportId: string;
  report: string;
  features: FeatureGroup[];
  totalInterviews: number;
  personaDistribution: { persona: string; count: number }[];
  createdAt: any;
}

interface FeatureGroup {
  title: string;
  priority: number;
  details: string;
  mentionCount: number;
  personas: string[];
  quotes: string[];
}

const defaultSummaryReport = `
# 高級宿泊施設ヴィラに関するインタビュー結果まとめ

## 求められている特徴

### 非日常的な体験
- 高級ヴィラは、日常から完全に切り離された非日常的な体験を提供することが求められています。オーシャンビューの部屋からの絶景や、プライベートプールでの贅沢な時間は、宿泊客に特別な体験を提供します。高級感のある内装や充実したアメニティは、日常では味わえない贅沢さを演出し、宿泊客に「特別な場所にいる」という感覚を与えます。また、地元の文化を反映したアート作品や、その土地ならではの食事体験は、新鮮な刺激と驚きを提供し、飽きのこない滞在を実現します。

### 天候に左右されない快適さ
- 高級ヴィラは、天候に関わらず快適な滞在を保証することが期待されています。オールシーズン利用可能なプライベートプールや、室内のスパ施設は、雨天時でも楽しめる重要な設備です。また、広々とした窓からの眺望は、晴れの日の絶景だけでなく、雨や嵐の日の荒々しい自然の姿も楽しむことができ、天候を問わず魅力的な景色を提供します。さらに、24時間対応のルームサービスやインドアアクティビティの充実は、悪天候時でも宿泊客を退屈させない工夫として重要視されています。

### プライバシーの確保
- プライバシーの確保は、高級ヴィラの最も重要な特徴の一つです。他の宿泊客を気にせずにくつろげる私的空間は、真のラグジュアリー体験には欠かせません。プライベートプールや専用のダイニングエリアは、完全なプライバシーを保ちながら贅沢な時間を過ごせる環境を提供します。また、静かな環境を重視した立地選びや防音設計は、外部からの干渉を最小限に抑え、宿泊客が自分だけの世界に浸れるようにします。さらに、パーソナライズされたサービスの提供は、各宿泊客の個別のニーズに応えつつ、プライバシーを尊重したアプローチで行われることが期待されています。

### オーシャンビュー
- オーシャンビューは、高級ヴィラの最も人気のある特徴の一つです。宿泊客は、広々とした窓から広がる海の絶景を求めています。部屋からの海の眺めは、最高のリラックス効果をもたらし、日常のストレスから解放されるような感覚を提供します。多くの宿泊客は、サンセットやサンライズの絶景を楽しむことを特に楽しみにしており、これらの瞬間は忘れられない思い出となります。また、波の音を聞きながら過ごせる環境は、深い癒しと安らぎをもたらし、本当の意味でのバケーション気分を味わえると高く評価されています。

### プライベートプール
- プライベートプールは、高級ヴィラの象徴的な特徴として強く求められています。他の宿泊客を気にせずにくつろげる私的空間は、真のラグジュアリー体験には欠かせません。深夜や早朝でも自由に利用できることが大きな魅力で、自分のペースで休暇を楽しめる点が高く評価されています。また、子供連れの家族にとっては、安心して遊べる環境として重宝されています。プールサイドでのくつろぎや、プライベートなパーティーの開催など、多様な楽しみ方ができることも人気の理由です。

### 高級感のある内装
- 高級ヴィラの内装は、宿泊客の期待を大きく左右する要素です。上質な素材を使用した家具や調度品は、視覚的な美しさだけでなく、触れた時の感触にもこだわりが求められます。現地の文化を反映したアート作品の展示は、その土地ならではの雰囲気を味わえる点で高く評価されています。同時に、最新のテクノロジーを備えた設備も不可欠です。スマートホームシステムや高性能な家電製品など、現代的な快適さと伝統的な美しさのバランスが取れた内装が理想とされています。

### 静かな環境
- 静寂は、多くの宿泊客が高級ヴィラに求める重要な要素です。他の宿泊客の騒音が聞こえない防音設計は、プライバシーと快適さを確保する上で欠かせません。自然に囲まれた立地は、都会の喧騒から離れ、心身ともにリフレッシュできる環境を提供します。交通騒音のない場所は、特に都市部からの旅行者に強く求められており、完全な静けさの中で過ごす時間は、贅沢な休暇の象徴とされています。

### スパ施設
- 高級ヴィラにおけるスパ施設は、単なる付加価値ではなく、滞在体験の中核を成す要素として認識されています。プロのセラピストによるマッサージサービスは、高度な技術と豊富な経験を持つスタッフによる施術が期待されています。多様なトリートメントメニューは、個々の宿泊客のニーズや好みに合わせたカスタマイズが可能であることが重要です。最新の設備を備えたリラクゼーションエリアでは、サウナやジャグジー、瞑想スペースなど、総合的なウェルネス体験が提供されることが求められています。

### 充実したアメニティ
- アメニティの質と種類は、高級ヴィラの評価を大きく左右します。高級ブランドのバスアメニティは、単なる実用品ではなく、贅沢な体験の一部として期待されています。快適な睡眠のための選べる枕メニューは、個々の好みに合わせたカスタマイズ可能なサービスとして高く評価されています。新鮮なフルーツや地元の特産品のウェルカムギフトは、その土地ならではのホスピタリティを感じられる点で、宿泊客に強い印象を与えます。また、高品質なバスローブやスリッパ、ミニバーの充実度なども、細やかな配慮として注目されています。

### ゲストサービス
- 卓越したゲストサービスは、高級ヴィラ体験の要です。24時間対応のコンシェルジュサービスは、宿泊客のあらゆる要望に迅速かつ効率的に対応することが期待されています。多言語対応のスタッフは、国際的な宿泊客に安心感を提供し、スムーズなコミュニケーションを可能にします。パーソナライズされたサービスの提供は、各宿泊客の好みや要望を事前に把握し、滞在中のあらゆる面でカスタマイズされた体験を提供することを意味します。これには、特別なイベントの手配や、地域の隠れた名所への案内なども含まれます。

### 食事オプション
- 高級ヴィラにおける食事体験は、滞在の重要な部分を占めます。地元の食材を使用した高級レストランは、その土地の食文化を体験できる貴重な機会として高く評価されています。プライベートダイニングの選択肢は、特別な日や親密な時間を過ごしたい宿泊客に人気があり、専属シェフによる特別メニューやロマンティックな設定など、カスタマイズされた体験が求められています。24時間ルームサービスは、時間を問わず高品質な食事を楽しめる便利さが評価されており、深夜の軽食から朝食まで、幅広いメニューが期待されています。

### アクティビティ
- 高級ヴィラの滞在を更に充実させるアクティビティは、多くの宿泊客にとって重要な選択基準となっています。地元のガイドによるエクスクルーシブツアーは、その土地の隠れた魅力や文化を深く知る機会として高く評価されています。これらのツアーでは、一般的な観光では体験できない特別な場所への訪問や、地元の人々との交流が含まれることが期待されています。ヨガやメディテーションのクラスは、心身のリラックスと再活性化を求める宿泊客に人気があり、経験豊富なインストラクターによる指導が求められています。ウォータースポーツや自然体験アクティビティは、アドベンチャー志向の宿泊客に特に人気があり、安全性と専門性の高いガイダンスが重視されています。これらのアクティビティは、ヴィラの立地や周辺環境を最大限に活かし、独自の体験を提供することが期待されています。

### 持続可能性への取り組み
- 近年、高級ヴィラの選択において、持続可能性への取り組みが重要な基準となっています。環境に配慮した設備や運営方針は、エコ意識の高い宿泊客から強く求められており、省エネルギー設備、水の再利用システム、プラスチック使用の削減などが評価のポイントとなっています。地域社会への貢献活動は、ヴィラが単なる宿泊施設ではなく、地域と共生する存在であることを示す重要な要素です。地元の雇用創出、文化保護活動への参加、教育支援などの取り組みが高く評価されています。オーガニック製品の使用は、食事やアメニティにおいて特に注目されており、地元の有機農家との提携や、化学物質を使用しない清掃用品の採用なども、宿泊客の関心を集めています。これらの取り組みは、高級な滞在体験と環境への配慮の両立を求める現代の宿泊客のニーズに応えるものとして、ますます重要性を増しています。
`;


const SummaryContent = ({ theme }: ComponentProps): JSX.Element => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});
  const [summaryReport, setSummaryReport] = useState<SummaryReport | null>(null);
  const [reportText, setReportText] = useState<string>(defaultSummaryReport);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [individualReportCount, setIndividualReportCount] = useState(0);

  // Firestoreからサマリーレポートを取得
  useEffect(() => {
    if (!theme.themeId) return;

    const themeRef = doc(db, 'themes', theme.themeId);
    const summaryReportRef = collection(themeRef, 'summaryReport');
    
    const unsubscribe = onSnapshot(summaryReportRef, 
      (snapshot) => {
        setIsLoading(false);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data() as SummaryReport;
          setSummaryReport(data);
          setReportText(data.report);
        } else {
          setSummaryReport(null);
          setReportText('');
        }
      },
      (error) => {
        console.error('サマリーレポート取得エラー:', error);
        setError('レポートの取得に失敗しました');
        setIsLoading(false);
      }
    );

    // 個別レポート数をカウント
    const interviewsRef = collection(themeRef, 'interviews');
    const unsubscribeInterviews = onSnapshot(interviewsRef, async (snapshot) => {
      let reportCount = 0;
      for (const interviewDoc of snapshot.docs) {
        const reportRef = collection(interviewDoc.ref, 'individualReport');
        const reportSnapshot = await getDocs(reportRef);
        if (!reportSnapshot.empty) {
          reportCount++;
        }
      }
      setIndividualReportCount(reportCount);
    });

    return () => {
      unsubscribe();
      unsubscribeInterviews();
    };
  }, [theme.themeId]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // サマリーレポートを生成
  const generateSummaryReport = async () => {
    if (!theme.themeId || !theme.theme) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/report/summaryReport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          themeId: theme.themeId,
          themeName: theme.theme,
          forceRegenerate: true,
          useGPT4: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'レポート生成に失敗しました');
      }

      const result = await response.json();
      // Firestoreのリスナーが自動的に更新を検知
      
    } catch (error) {
      console.error('サマリーレポート生成エラー:', error);
      setError((error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const components: Components = {
    h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-6 text-gray-900" {...props} />,
    h2: ({node, children, ...props}) => {
      return <h2 className="text-2xl font-semibold mt-8 mb-4 pb-2 border-b-2 border-blue-200 text-gray-800" {...props}>{children}</h2>;
    },
    h3: ({node, children, ...props}) => {
      const sectionKey = children?.toString() || '';
      // H3はアコーディオンとして表示
      return (
        <div className="mt-6 mb-4">
          <button 
            onClick={() => toggleSection(sectionKey)}
            className="flex justify-between items-center w-full text-lg font-semibold text-left bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 px-4 py-3 rounded-lg shadow-sm border border-blue-200"
          >
            <span className="text-gray-800">{children}</span>
            <span className={`text-blue-500 ${openSections[sectionKey] ? 'rotate-180' : ''} transition-transform duration-200`}>
              ▼
            </span>
          </button>
        </div>
      );
    },
    p: ({node, ...props}) => {
      return <p className="mb-4 text-gray-700 leading-relaxed" {...props} />;
    },
    ul: ({ node, children, ...props }) => {
      // 親要素を確認
      const parentNode = node?.position;
      if (parentNode) {
        const lines = reportText.split('\n');
        let isInAccordion = false;
        let sectionKey = '';
        
        // 現在の位置から上に遡って、直近の見出しを探す
        for (let i = parentNode.start.line - 2; i >= 0; i--) {
          const line = lines[i];
          if (line && line.startsWith('### ')) {
            sectionKey = line.replace('### ', '').trim();
            isInAccordion = true;
            break;
          } else if (line && line.startsWith('## ')) {
            // H2セクションに到達したら、アコーディオンではない
            break;
          }
        }
        
        if (isInAccordion && !openSections[sectionKey]) {
          return null; // アコーディオンが閉じている場合は非表示
        }
      }
      return <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700" {...props}>{children}</ul>;
    },
    li: ({node, ...props}) => {
      return <li className="text-gray-700 leading-relaxed" {...props} />;
    },
    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4" {...props} />,
    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-4" {...props} />,
    a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
  };
  

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {/* ヘッダーのスケルトン */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        {/* コンテンツのスケルトン */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Skeleton className="h-6 w-1/2 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="mt-6">
            <Skeleton className="h-6 w-1/3 mb-3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        
        {/* グラフのスケルトン */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // エラーメッセージの表示
  if (error) {
    return (
      <div className="px-6 py-4">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <p className="text-sm text-red-700">エラー: {error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // サマリーレポートがまだ生成されていない場合
  if (!summaryReport && !isGenerating) {
    return (
      <div className="px-6 py-8">
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">サマリーレポート未生成</h3>
          <p className="text-gray-600 mb-4">
            現在{individualReportCount}件の個別レポートがあります。
            {individualReportCount >= 3 ? (
              <>サマリーレポートを生成できます。</>
            ) : (
              <>サマリー生成には最低3件のレポートが必要です。</>
            )}
          </p>
          {individualReportCount >= 3 && (
            <LoadingButton
              onClick={generateSummaryReport}
              loading={isGenerating}
              loadingText="生成中..."
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-md transition-colors"
            >
              サマリーレポートを生成
            </LoadingButton>
          )}
        </div>
      </div>
    );
  }

  // 生成中の表示
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <LoadingIcons.SpinningCircles className="w-12 h-12 text-primary" />
        <p className="mt-4 text-lg">サマリーレポートを生成中...</p>
        <p className="text-sm text-gray-600 mt-2">しばらくお待ちください</p>
      </div>
    );
  }

  // サマリーレポートの表示
  return (
    <div className="px-6">
      {/* ヘッダー情報 */}
      {summaryReport && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                インタビュー数: {summaryReport.totalInterviews}件
              </p>
              <p className="text-sm text-gray-600">
                ペルソナ分布: {summaryReport.personaDistribution?.map(p => `${p.persona}(${p.count})`).join(', ')}
              </p>
            </div>
            <button
              onClick={generateSummaryReport}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              title="レポートを再生成"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* マークダウンコンテンツ */}
      <div className="prose max-w-none text-gray-700">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
          components={components}
        >
          {reportText}
        </ReactMarkdown>
      </div>
    </div>
  );


    // return (
    //     <div className="mt-4">
    //         <h2 className="text-2xl font-bold mb-4">インタビュー結果</h2>
    //         {theme.reportCreated ? (
    //             <p>レポートが正常に作成されました。</p>
    //         ) : (
    //             <>
    //                 {theme.collectInterviewsCount > 1 && theme.collectInterviewsCount >= theme.maximumNumberOfInterviews ? (
    //                     <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
    //                         サマリーレポートを作成
    //                     </button>
    //                 ) : (
    //                     <p>まだインタビューが完了していません。</p>
    //                 )}
    //             </>
    //         )}
    //     </div>
    // )
}

export default SummaryContent
