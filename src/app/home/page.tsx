"use client"
import { Button } from "@/context/components/ui/button"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowRight,
  Badge,
  BarChart3,
  Calendar,
  CheckCircle,
  Users,
  Zap,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Clock,
  Target,
  Brain,
  Mic,
  Bot,
  Shield,
  Play
} from "lucide-react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/context/components/ui/card"
import SelectSubscriptionPlans from "../client-view/[userId]/subscriptions/components/selectSubsctiptionPlans"
import { Suspense, useEffect, useState } from "react"

const Loading = () => <div>読み込み中...</div>;

const Home = () => {
  const router = useRouter()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleGetStarted = () => {
    router.push("/users/")
  }

  const handleClientStarted = () => {
    router.push("/clients/register")
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <main className="flex-1">
        {/* フルスクリーンヒーローセクション - フルワイド */}
        <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
          {/* メッシュグラデーション背景 */}
          <div className="absolute inset-0 mesh-gradient-2 opacity-30 dark:opacity-40"></div>

          {/* 動的な背景要素 - より大きく鮮やか */}
          <div className="absolute -top-20 left-1/4 w-[600px] h-[600px] bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-cyan-500/30 rounded-full blur-3xl animate-pulse animation-delay-400"></div>
          <div className="absolute top-1/3 right-1/3 w-[500px] h-[500px] bg-pink-500/30 rounded-full blur-3xl animate-pulse animation-delay-200"></div>

          {/* コンテンツ - フルワイド */}
          <div className="w-full px-6 sm:px-8 md:px-16 lg:px-24 relative z-10">
            <div className="flex flex-col items-center justify-center text-center space-y-10">
              {/* バッジ - ガラスエフェクト */}
              <div className="animate-fade-in-down">
                <Badge className="inline-flex items-center glass-medium text-purple-700 dark:text-purple-300 px-6 py-2.5 text-sm font-semibold shadow-lg hover:shadow-purple-500/30 transition-all duration-300 border border-purple-200 dark:border-purple-700">
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI×感性工学の新時代
                </Badge>
              </div>

              {/* メインタイトル */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight max-w-5xl animate-fade-in-up animation-delay-200 leading-tight">
                <span className="gradient-text-purple block mb-3">
                  インタビューを、
                </span>
                <span className="block text-slate-900 dark:text-white">
                  もっと自由に。
                </span>
              </h1>

              {/* サブタイトル */}
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-700 dark:text-slate-300 max-w-3xl leading-relaxed animate-fade-in-up animation-delay-400 px-4">
                Auto N1 Interviewは、AIと感性工学の力で、<br className="hidden sm:block" />
                誰もが高品質なインタビューを、いつでも、どこでも実施できる未来を創ります。
              </p>

              {/* CTA ボタン - ガラスコンテナ */}
              <div className="glass-medium rounded-3xl p-6 sm:p-8 mt-8 animate-fade-in-up animation-delay-600 max-w-4xl w-full mx-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-6 rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-semibold w-full sm:w-auto"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    無料で始める
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    onClick={handleClientStarted}
                    size="lg"
                    variant="outline"
                    className="glass-light border-2 border-purple-500/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold backdrop-blur-sm w-full sm:w-auto"
                  >
                    <Users className="mr-2 h-5 w-5" />
                    組織向けプラン
                  </Button>
                </div>
              </div>

              {/* 統計情報 - ガラスカード */}
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 mt-12 mb-20 animate-fade-in animation-delay-600 px-4">
                <div className="glass-light rounded-2xl px-6 sm:px-8 py-5 text-center hover-glow min-w-[140px]">
                  <div className="text-3xl sm:text-4xl font-bold gradient-text-purple">10,000+</div>
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 mt-2 font-medium">実施インタビュー数</div>
                </div>
                <div className="glass-light rounded-2xl px-6 sm:px-8 py-5 text-center hover-glow min-w-[140px]">
                  <div className="text-3xl sm:text-4xl font-bold gradient-text-purple">95%</div>
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 mt-2 font-medium">顧客満足度</div>
                </div>
                <div className="glass-light rounded-2xl px-6 sm:px-8 py-5 text-center hover-glow min-w-[140px]">
                  <div className="text-3xl sm:text-4xl font-bold gradient-text-purple">70%</div>
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 mt-2 font-medium">コスト削減</div>
                </div>
              </div>
            </div>
          </div>

          {/* スクロールインジケーター */}
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 scroll-indicator z-20">
            <div className="glass-medium rounded-full p-2.5 hover:scale-110 transition-transform cursor-pointer">
              <ChevronDown className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </section>

        {/* 信頼の証セクション - 実際のロゴがある場合のみ表示 */}
        {/* 現在は非表示 */}

        {/* 問題提起セクション - フルワイド */}
        <section className="w-full py-32 md:py-40 relative overflow-hidden">
          {/* グラデーション背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-950/30 dark:to-pink-950/30"></div>
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-200/20 dark:bg-red-900/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-200/20 dark:bg-orange-900/20 rounded-full blur-3xl"></div>

          <div className="w-full px-6 sm:px-8 md:px-16 lg:px-24 relative z-10">
            <div className="max-w-7xl mx-auto text-center space-y-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight px-4">
                従来のインタビュー、<br />
                <span className="gradient-text-purple">こんな課題を抱えていませんか？</span>
              </h2>

              <div className="grid gap-6 md:grid-cols-3 mt-12 px-4">
                <div className="glass-medium rounded-3xl p-6 sm:p-8 hover-glow-pink group">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">高額なコスト</h3>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                      専門家の手配、会場費、移動費...累積すると莫大な支出に
                    </p>
                  </div>
                </div>

                <div className="glass-medium rounded-3xl p-6 sm:p-8 hover-glow group">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">調整の煩雑さ</h3>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                      スケジュール調整だけで数週間...プロジェクトの遅延に
                    </p>
                  </div>
                </div>

                <div className="glass-medium rounded-3xl p-6 sm:p-8 hover-glow-blue group">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Target className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">品質のばらつき</h3>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                      インタビュアーの経験により、得られる情報の質に大きな差が
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ベントボックスレイアウト - ソリューション - フルワイド */}
        <section className="w-full py-32 md:py-40 relative overflow-hidden">
          {/* グラデーション背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-cyan-50 to-purple-50 dark:from-slate-950 dark:via-cyan-950/20 dark:to-purple-950/20"></div>
          <div className="absolute top-1/4 left-0 w-[700px] h-[700px] bg-purple-300/20 dark:bg-purple-700/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-cyan-300/20 dark:bg-cyan-700/20 rounded-full blur-3xl"></div>

          <div className="w-full px-6 sm:px-8 md:px-16 lg:px-24 relative z-10">
            <div className="text-center space-y-4 mb-16 px-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="gradient-text-purple">Auto N1 Interview</span> が<br />
                すべての課題を解決します
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                AI技術と感性工学の融合により、革新的なインタビュー体験を提供
              </p>
            </div>

            {/* ベントグリッド */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
              {/* 大きなカード - AIインタビュアー */}
              <div className="md:col-span-2 md:row-span-2 glass-medium rounded-3xl p-6 sm:p-8 overflow-hidden group relative hover-glow">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <Bot className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div>
                      <Badge className="glass-light text-purple-700 dark:text-purple-300 mb-2 px-3 py-1 text-xs">Core Feature</Badge>
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">AIインタビュアー</h3>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                    3Dアバターが自然な対話でインタビューを実施。被験者の回答に応じて、最適な追加質問を自動生成します。
                  </p>
                  <div className="flex flex-col gap-3 mt-6">
                    <div className="flex items-start gap-3 glass-light rounded-xl p-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">自然な日本語での対話</span>
                    </div>
                    <div className="flex items-start gap-3 glass-light rounded-xl p-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">リアルタイム音声認識</span>
                    </div>
                    <div className="flex items-start gap-3 glass-light rounded-xl p-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">文脈を理解した深掘り質問</span>
                    </div>
                  </div>
                  {/* ロゴ表示 */}
                  <div className="mt-8 glass-light rounded-2xl p-6 sm:p-8">
                    <div className="relative h-40 sm:h-48 w-full">
                      <Image
                        src="/logo/logo_square.svg"
                        alt="AI Avatar"
                        fill
                        className="object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 感性工学 */}
              <div className="glass-medium rounded-3xl p-6 hover-glow-blue group">
                <div className="flex flex-col h-full">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg flex-shrink-0">
                    <Brain className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">感性工学分析</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    音声、テキスト、表情から感情を多角的に分析し、深層心理を可視化
                  </p>
                </div>
              </div>

              {/* リアルタイム文字起こし */}
              <div className="glass-medium rounded-3xl p-6 hover-glow group">
                <div className="flex flex-col h-full">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg flex-shrink-0">
                    <Mic className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">自動文字起こし</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    会話をリアルタイムでテキスト化。後から検索・分析も簡単に
                  </p>
                </div>
              </div>

              {/* データセキュリティ */}
              <div className="glass-medium rounded-3xl p-6 hover-glow group">
                <div className="flex flex-col h-full">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg flex-shrink-0">
                    <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">安全なデータ管理</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    エンタープライズグレードのセキュリティで大切なデータを保護
                  </p>
                </div>
              </div>

              {/* コスト削減 */}
              <div className="md:col-span-2 glass-medium rounded-3xl p-6 sm:p-8 hover-glow group">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">最大70%のコスト削減</h3>
                </div>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                  従来のインタビューと比較して、大幅なコストダウンを実現
                </p>
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="text-center p-4 sm:p-6 glass-light rounded-2xl">
                    <div className="text-2xl sm:text-3xl font-bold text-teal-600">¥500,000</div>
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">従来のコスト/月</div>
                  </div>
                  <div className="text-center p-4 sm:p-6 glass-light rounded-2xl">
                    <div className="text-2xl sm:text-3xl font-bold text-emerald-600">¥150,000</div>
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">Auto N1/月</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* お客様の声 - モダンカルーセル風 - フルワイド */}
        <section className="w-full py-32 md:py-40 relative overflow-hidden">
          {/* グラデーション背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-blue-950/20 dark:via-slate-950 dark:to-green-950/20"></div>
          <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-blue-200/20 dark:bg-blue-700/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-green-200/20 dark:bg-green-700/20 rounded-full blur-3xl"></div>

          <div className="w-full px-6 sm:px-8 md:px-16 lg:px-24 relative z-10">
            <div className="text-center space-y-4 mb-16 px-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                お客様の<span className="gradient-text-purple">成功事例</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                様々な業界でAuto N1 Interviewが活躍しています
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-7xl mx-auto px-4">
              <div className="glass-medium rounded-3xl p-6 sm:p-8 hover-glow-blue group">
                <div className="flex items-center gap-3 sm:gap-4 mb-6">
                  <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <Users className="h-8 w-8 sm:h-9 sm:w-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">田中 美咲様</h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">大手メーカー 人事部長</p>
                  </div>
                </div>
                <div className="relative mt-4">
                  <div className="absolute -left-2 -top-2 text-5xl sm:text-6xl text-blue-300/40 dark:text-blue-600/25">"</div>
                  <p className="text-slate-700 dark:text-slate-300 relative z-10 pl-5 text-sm sm:text-base leading-relaxed">
                    採用プロセスの効率が劇的に向上。一次面接をAIに任せることで、人事チームは最終選考に集中できるようになりました。
                  </p>
                </div>
                <div className="mt-6 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>

              <div className="glass-medium rounded-3xl p-6 sm:p-8 hover-glow group">
                <div className="flex items-center gap-3 sm:gap-4 mb-6">
                  <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <BarChart3 className="h-8 w-8 sm:h-9 sm:w-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">佐藤 健太様</h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">IT企業 製品開発マネージャー</p>
                  </div>
                </div>
                <div className="relative mt-4">
                  <div className="absolute -left-2 -top-2 text-5xl sm:text-6xl text-emerald-300/40 dark:text-emerald-600/25">"</div>
                  <p className="text-slate-700 dark:text-slate-300 relative z-10 pl-5 text-sm sm:text-base leading-relaxed">
                    感性工学による分析が特に有用。ユーザーが明示していない潜在的なニーズも把握できています。
                  </p>
                </div>
                <div className="mt-6 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>

              <div className="glass-medium rounded-3xl p-6 sm:p-8 hover-glow-pink group">
                <div className="flex items-center gap-3 sm:gap-4 mb-6">
                  <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <TrendingUp className="h-8 w-8 sm:h-9 sm:w-9 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">山田 恵子様</h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">マーケティングリサーチャー</p>
                  </div>
                </div>
                <div className="relative mt-4">
                  <div className="absolute -left-2 -top-2 text-5xl sm:text-6xl text-purple-300/40 dark:text-purple-600/25">"</div>
                  <p className="text-slate-700 dark:text-slate-300 relative z-10 pl-5 text-sm sm:text-base leading-relaxed">
                    市場調査の質と量が向上し、クライアントからの評価も高まりました。従来より豊富なデータが得られています。
                  </p>
                </div>
                <div className="mt-6 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 料金プラン - フルワイド */}
        <section id="pricing" className="w-full py-32 md:py-40 relative overflow-hidden">
          {/* グラデーション背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-slate-950"></div>
          <div className="absolute top-1/3 right-0 w-[800px] h-[800px] bg-purple-300/20 dark:bg-purple-700/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-pink-300/20 dark:bg-pink-700/20 rounded-full blur-3xl"></div>

          <div className="w-full px-6 sm:px-8 md:px-16 lg:px-24 relative z-10">
            <div className="text-center space-y-4 mb-16 px-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                シンプルで<span className="gradient-text-purple">明快な料金</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                ニーズに合わせて選べるプラン
              </p>
            </div>
            <div className="w-full glass-medium rounded-3xl p-6 sm:p-8">
              <Suspense fallback={
                <div className="flex justify-center items-center py-20">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
                    <p className="text-lg text-slate-700 dark:text-slate-300">料金プランを読み込み中...</p>
                  </div>
                </div>
              }>
                <SelectSubscriptionPlans />
              </Suspense>
            </div>
          </div>
        </section>

        {/* 最終CTA - フルスクリーン フルワイド */}
        <section className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
          {/* 背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"></div>
          <div className="absolute inset-0 mesh-gradient opacity-40"></div>

          {/* 装飾要素 - より大きく */}
          <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl animate-pulse animation-delay-400"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl"></div>

          <div className="w-full px-6 sm:px-8 md:px-16 lg:px-24 relative z-10">
            <div className="flex flex-col items-center justify-center text-center space-y-12 text-white">
              {/* メインコンテンツ */}
              <div className="space-y-6 max-w-5xl px-4">
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                  今すぐ、未来の<br />
                  インタビューを体験
                </h2>
                <p className="text-lg sm:text-xl md:text-2xl text-white/95 max-w-3xl mx-auto leading-relaxed">
                  14日間の無料トライアル。クレジットカード不要。<br className="hidden sm:block" />
                  数分で始められます。
                </p>
              </div>

              {/* CTAボタン - ガラスコンテナ */}
              <div className="glass-strong rounded-3xl p-6 sm:p-8 md:p-10 max-w-4xl w-full mx-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 justify-center items-center">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-white/95 text-lg sm:text-xl px-10 sm:px-14 py-5 sm:py-7 rounded-xl shadow-2xl hover:scale-105 transition-all duration-300 font-bold hover-shine w-full sm:w-auto"
                  >
                    <Play className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                    無料で始める
                    <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                  <Button
                    onClick={handleClientStarted}
                    size="lg"
                    variant="outline"
                    className="glass-medium border-2 border-white text-white hover:bg-white/20 text-lg sm:text-xl px-10 sm:px-14 py-5 sm:py-7 rounded-xl shadow-xl hover:scale-105 transition-all duration-300 font-bold backdrop-blur-sm w-full sm:w-auto"
                  >
                    <Users className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                    営業に相談
                  </Button>
                </div>
              </div>

              {/* 追加の信頼要素 - ガラスバッジ */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mt-8 px-4">
                <div className="glass-light rounded-full px-4 sm:px-5 py-2 sm:py-2.5 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm sm:text-base font-semibold">14日間無料</span>
                </div>
                <div className="glass-light rounded-full px-4 sm:px-5 py-2 sm:py-2.5 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm sm:text-base font-semibold">カード登録不要</span>
                </div>
                <div className="glass-light rounded-full px-4 sm:px-5 py-2 sm:py-2.5 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm sm:text-base font-semibold">いつでもキャンセル可能</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* フッター - フルワイド */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-16 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-50/30 dark:to-purple-950/10"></div>

        <div className="w-full px-8 md:px-16 lg:px-24 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">製品</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">機能</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition-colors">料金</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">事例</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">サポート</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">ヘルプセンター</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">お問い合わせ</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">よくある質問</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">会社</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">会社概要</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">採用情報</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">ブログ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">法的情報</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/term/PrivacyPolicy" className="hover:text-foreground transition-colors">プライバシーポリシー</Link></li>
                <li><Link href="/term/TermsOfService" className="hover:text-foreground transition-colors">利用規約</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">特定商取引法</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo/logo_square.svg"
                alt="Auto N1 Interview"
                width={32}
                height={32}
              />
              <span className="font-semibold">Auto N1 Interview</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} kanseibunseki Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Home />
    </Suspense>
  );
}
