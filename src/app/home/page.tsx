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
        {/* フルスクリーンヒーローセクション */}
        <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
          {/* メッシュグラデーション背景 */}
          <div className="absolute inset-0 mesh-gradient-2 opacity-20 dark:opacity-30"></div>

          {/* 動的な背景要素 */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-3xl animate-pulse animation-delay-400"></div>
          <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-pink-400/20 rounded-full blur-3xl animate-pulse animation-delay-200"></div>

          {/* コンテンツ */}
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center text-center space-y-8">
              {/* バッジ */}
              <div className="animate-fade-in-down">
                <Badge className="inline-flex bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-6 py-2 text-sm font-semibold shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 border-0">
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI×感性工学の新時代
                </Badge>
              </div>

              {/* メインタイトル */}
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter max-w-5xl animate-fade-in-up animation-delay-200">
                <span className="gradient-text-purple block mb-2">
                  インタビューを、
                </span>
                <span className="block">
                  もっと自由に。
                </span>
              </h1>

              {/* サブタイトル */}
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed animate-fade-in-up animation-delay-400">
                Auto N1 Interviewは、AIと感性工学の力で、<br className="hidden sm:block" />
                誰もが高品質なインタビューを、いつでも、どこでも実施できる未来を創ります。
              </p>

              {/* CTA ボタン */}
              <div className="flex flex-col sm:flex-row gap-4 mt-8 animate-fade-in-up animation-delay-600">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg px-8 py-6 rounded-full shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 hover-shine"
                >
                  <Play className="mr-2 h-5 w-5" />
                  無料で始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  onClick={handleClientStarted}
                  size="lg"
                  variant="outline"
                  className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 text-lg px-8 py-6 rounded-full shadow-xl hover:scale-105 transition-all duration-300"
                >
                  <Users className="mr-2 h-5 w-5" />
                  組織向けプラン
                </Button>
              </div>

              {/* 統計情報 */}
              <div className="flex flex-wrap justify-center gap-8 mt-12 animate-fade-in animation-delay-600">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold gradient-text-purple">10,000+</div>
                  <div className="text-sm text-muted-foreground mt-1">実施インタビュー数</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold gradient-text-purple">95%</div>
                  <div className="text-sm text-muted-foreground mt-1">顧客満足度</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold gradient-text-purple">70%</div>
                  <div className="text-sm text-muted-foreground mt-1">コスト削減</div>
                </div>
              </div>
            </div>
          </div>

          {/* スクロールインジケーター */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 scroll-indicator">
            <ChevronDown className="h-8 w-8 text-purple-600" />
          </div>
        </section>

        {/* 信頼の証 - ロゴウォール */}
        <section className="w-full py-16 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
          <div className="container px-4 md:px-6">
            <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-wider">
              Leading companies trust us
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              {/* ロゴプレースホルダー - 実際のロゴに置き換え可能 */}
              <div className="h-12 w-32 bg-gradient-to-r from-slate-300 to-slate-400 rounded"></div>
              <div className="h-12 w-32 bg-gradient-to-r from-slate-300 to-slate-400 rounded"></div>
              <div className="h-12 w-32 bg-gradient-to-r from-slate-300 to-slate-400 rounded"></div>
              <div className="h-12 w-32 bg-gradient-to-r from-slate-300 to-slate-400 rounded"></div>
            </div>
          </div>
        </section>

        {/* 問題提起セクション */}
        <section className="w-full py-24 md:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                従来のインタビュー、<br />
                <span className="gradient-text-purple">こんな課題を抱えていませんか？</span>
              </h2>

              <div className="grid gap-6 md:grid-cols-3 mt-12">
                <Card className="border-2 border-red-200 dark:border-red-900 hover:border-red-400 transition-all duration-300 group">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle className="text-lg">高額なコスト</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      専門家の手配、会場費、移動費...累積すると莫大な支出に
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 dark:border-orange-900 hover:border-orange-400 transition-all duration-300 group">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">調整の煩雑さ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      スケジュール調整だけで数週間...プロジェクトの遅延に
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-yellow-200 dark:border-yellow-900 hover:border-yellow-400 transition-all duration-300 group">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Target className="h-6 w-6 text-yellow-600" />
                    </div>
                    <CardTitle className="text-lg">品質のばらつき</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      インタビュアーの経験により、得られる情報の質に大きな差が
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ベントボックスレイアウト - ソリューション */}
        <section className="w-full py-24 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="gradient-text-purple">Auto N1 Interview</span> が<br />
                すべての課題を解決します
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                AI技術と感性工学の融合により、革新的なインタビュー体験を提供
              </p>
            </div>

            {/* ベントグリッド */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* 大きなカード - AIインタビュアー */}
              <Card className="md:col-span-2 md:row-span-2 border-2 border-purple-200 dark:border-purple-900 hover:border-purple-400 transition-all duration-500 overflow-hidden group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Bot className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 mb-2">Core Feature</Badge>
                      <CardTitle className="text-2xl md:text-3xl">AIインタビュアー</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 space-y-4">
                  <p className="text-lg text-muted-foreground">
                    3Dアバターが自然な対話でインタビューを実施。被験者の回答に応じて、最適な追加質問を自動生成します。
                  </p>
                  <div className="flex flex-col gap-3 mt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">自然な日本語での対話</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">リアルタイム音声認識</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">文脈を理解した深掘り質問</span>
                    </div>
                  </div>
                  {/* ロゴ表示 */}
                  <div className="mt-8 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl">
                    <div className="relative h-48 w-full">
                      <Image
                        src="/logo/logo_square.svg"
                        alt="AI Avatar"
                        fill
                        className="object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 感性工学 */}
              <Card className="border-2 border-cyan-200 dark:border-cyan-900 hover:border-cyan-400 transition-all duration-300 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">感性工学分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    音声、テキスト、表情から感情を多角的に分析し、深層心理を可視化
                  </p>
                </CardContent>
              </Card>

              {/* リアルタイム文字起こし */}
              <Card className="border-2 border-indigo-200 dark:border-indigo-900 hover:border-indigo-400 transition-all duration-300 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <Mic className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">自動文字起こし</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    会話をリアルタイムでテキスト化。後から検索・分析も簡単に
                  </p>
                </CardContent>
              </Card>

              {/* データセキュリティ */}
              <Card className="border-2 border-green-200 dark:border-green-900 hover:border-green-400 transition-all duration-300 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">安全なデータ管理</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    エンタープライズグレードのセキュリティで大切なデータを保護
                  </p>
                </CardContent>
              </Card>

              {/* コスト削減 */}
              <Card className="md:col-span-2 border-2 border-teal-200 dark:border-teal-900 hover:border-teal-400 transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">最大70%のコスト削減</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    従来のインタビューと比較して、大幅なコストダウンを実現
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-teal-50 dark:bg-teal-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-teal-600">¥500,000</div>
                      <div className="text-xs text-muted-foreground mt-1">従来のコスト/月</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">¥150,000</div>
                      <div className="text-xs text-muted-foreground mt-1">Auto N1/月</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* お客様の声 - モダンカルーセル風 */}
        <section className="w-full py-24 md:py-32 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <div className="container px-4 md:px-6">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                お客様の<span className="gradient-text-purple">成功事例</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                様々な業界でAuto N1 Interviewが活躍しています
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
              <Card className="border-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">田中 美咲様</CardTitle>
                      <CardDescription>大手メーカー 人事部長</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute -left-2 -top-2 text-6xl text-blue-200 dark:text-blue-800 opacity-50">"</div>
                    <p className="text-muted-foreground relative z-10 pl-6">
                      採用プロセスの効率が劇的に向上。一次面接をAIに任せることで、人事チームは最終選考に集中できるようになりました。
                    </p>
                  </div>
                  <div className="mt-6 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <BarChart3 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">佐藤 健太様</CardTitle>
                      <CardDescription>IT企業 製品開発マネージャー</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute -left-2 -top-2 text-6xl text-green-200 dark:text-green-800 opacity-50">"</div>
                    <p className="text-muted-foreground relative z-10 pl-6">
                      感性工学による分析が特に有用。ユーザーが明示していない潜在的なニーズも把握できています。
                    </p>
                  </div>
                  <div className="mt-6 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">山田 恵子様</CardTitle>
                      <CardDescription>マーケティングリサーチャー</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute -left-2 -top-2 text-6xl text-purple-200 dark:text-purple-800 opacity-50">"</div>
                    <p className="text-muted-foreground relative z-10 pl-6">
                      市場調査の質と量が向上し、クライアントからの評価も高まりました。従来より豊富なデータが得られています。
                    </p>
                  </div>
                  <div className="mt-6 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* 料金プラン */}
        <section id="pricing" className="w-full py-24 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                シンプルで<span className="gradient-text-purple">明快な料金</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                ニーズに合わせて選べるプラン
              </p>
            </div>
            <div className="w-full">
              <Suspense fallback={
                <div className="flex justify-center items-center py-24">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
                    <p className="text-lg text-muted-foreground">料金プランを読み込み中...</p>
                  </div>
                </div>
              }>
                <SelectSubscriptionPlans />
              </Suspense>
            </div>
          </div>
        </section>

        {/* 最終CTA - フルスクリーン */}
        <section className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
          {/* 背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"></div>
          <div className="absolute inset-0 mesh-gradient opacity-30"></div>

          {/* 装飾要素 */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center text-center space-y-12 text-white">
              <div className="space-y-6 max-w-4xl">
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter">
                  今すぐ、未来の<br />
                  インタビューを体験
                </h2>
                <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                  14日間の無料トライアル。クレジットカード不要。<br />
                  数分で始められます。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-white/90 text-xl px-12 py-8 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 font-bold"
                >
                  <Play className="mr-3 h-6 w-6" />
                  無料で始める
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
                <Button
                  onClick={handleClientStarted}
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10 text-xl px-12 py-8 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 font-bold"
                >
                  <Users className="mr-3 h-6 w-6" />
                  営業に相談
                </Button>
              </div>

              {/* 追加の信頼要素 */}
              <div className="flex flex-wrap justify-center gap-8 mt-16 text-white/80">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>14日間無料</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>カード登録不要</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>いつでもキャンセル可能</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="w-full border-t py-12 bg-slate-50 dark:bg-slate-950">
        <div className="container px-4 md:px-6">
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
