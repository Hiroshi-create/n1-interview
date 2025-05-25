"use client"
import { Button } from "@/context/components/ui/button"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Badge, BarChart3, Calendar, CheckCircle, Users, Zap } from "lucide-react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/context/components/ui/card"
import SelectSubscriptionPlans from "../client-view/[userId]/subscriptions/components/selectSubsctiptionPlans"
import { Suspense } from "react"

const Loading = () => <div>読み込み中...</div>;

const Home = () => {
  const router = useRouter()

  const handleGetStarted = () => {
    router.push("/users/")
  }

  const handleClientStarted = () => {
    router.push("/clients/register")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* ヒーローセクション */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-5">
                <div className="space-y-3">
                  <Badge className="inline-flex bg-gradient-to-r from-blue-500 to-green-500 text-white">
                    新登場
                  </Badge>
                  <h1 className="text-2xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                    AIがインタビュアーに。時間とコストを削減、精度は向上
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Auto N1
                    Interviewは、AIを活用して高品質なインタビューを自動化し、感性工学による深い分析を提供するSaaSです
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button onClick={handleGetStarted} className="bg-blue-600 hover:bg-blue-700 text-white">
                    インタビューを受ける
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button onClick={handleClientStarted} className="bg-green-600 hover:bg-green-700 text-white">
                    組織アカウント作成
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative aspect-square w-full max-w-[450px]">
                  <Image
                    src="/placeholder.svg?height=450&width=450"
                    alt="AIインタビューのイラスト"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 主な課題と解決策 */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
              <div className="space-y-2 max-w-[800px]">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  インタビューの課題を解決
                </h2>
                <p className="text-muted-foreground md:text-xl">
                  Auto N1 Interviewは従来のインタビュープロセスの主な課題を解決します
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
              <Card className="flex flex-col items-center text-center h-full shadow-lg transition-all hover:shadow-xl">
                <CardHeader className="pb-2">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 p-4 dark:bg-blue-900 mb-4">
                    <Zap className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">高額な従来のインタビュー</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow pb-6">
                  <p className="text-muted-foreground">
                    専門家の時間や場所の確保、移動コストなど、従来のインタビューは高コストでした
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="flex items-center space-x-2 rounded-full bg-green-100 px-4 py-2 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">コスト削減</span>
                  </div>
                </CardFooter>
              </Card>
              <Card className="flex flex-col items-center text-center h-full shadow-lg transition-all hover:shadow-xl">
                <CardHeader className="pb-2">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 p-4 dark:bg-blue-900 mb-4">
                    <BarChart3 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">インタビュアーによる精度のばらつき</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow pb-6">
                  <p className="text-muted-foreground">
                    インタビュアーの経験や技術によって、得られる情報の質と量に大きな差が生じていました
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="flex items-center space-x-2 rounded-full bg-green-100 px-4 py-2 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">一貫した高品質</span>
                  </div>
                </CardFooter>
              </Card>
              <Card className="flex flex-col items-center text-center h-full shadow-lg transition-all hover:shadow-xl">
                <CardHeader className="pb-2">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 p-4 dark:bg-blue-900 mb-4">
                    <Calendar className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">スケジュール調整の煩雑さ</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow pb-6">
                  <p className="text-muted-foreground">
                    インタビュアーと被験者の日程調整は複雑で、プロジェクトの遅延原因となっていました
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="flex items-center space-x-2 rounded-full bg-green-100 px-4 py-2 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">いつでも即時実施可能</span>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* 用途セクション */}
        <section id="use-cases" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
              <div className="space-y-2 max-w-[800px]">
                <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl">
                  多様な場面で活用できるAIインタビュー
                </h2>
                <p className="text-muted-foreground md:text-xl">
                  Auto N1 Interviewはさまざまなビジネスシーンで活用できます
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
              <Card className="shadow-md transition-all hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">採用面接の事前スクリーニング</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    AIが一次面接を担当し、候補者の基本的なスキルや適性を評価。人事担当者の時間を節約します。
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-md transition-all hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">製品・サービスのユーザーフィードバック収集</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    製品やサービスに関するユーザーの詳細な意見を収集し、改善点を特定します。
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-md transition-all hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">市場調査と消費者インサイト</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    特定の市場や消費者層に関する深いインサイトを収集し、マーケティング戦略の立案に役立てます。
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-md transition-all hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">従業員満足度調査</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    従業員の本音を引き出し、職場環境や企業文化の改善につなげます。匿名性により率直な意見を収集できます。
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* 技術的特長 */}
        <section
          id="features"
          className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950"
        >
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl">
                    感性工学×AIによる深い分析
                  </h2>
                  <p className="text-muted-foreground md:text-xl">
                    収集したデータを感性工学の手法とAIで分析し、事象と感情の相関を可視化します。
                  </p>
                </div>
                <ul className="grid gap-5">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="mt-1 h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-lg">感情分析エンジン</h3>
                      <p className="text-muted-foreground">
                        テキスト、音声、表情から複合的に感情を分析し、より正確な感情状態を把握します。
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="mt-1 h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-lg">相関マッピング</h3>
                      <p className="text-muted-foreground">
                        特定の質問や話題と感情反応の相関を可視化し、インサイトを導き出します。
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="mt-1 h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-lg">適応型質問生成</h3>
                      <p className="text-muted-foreground">
                        回答内容に応じて最適な追加質問を生成し、より深い洞察を得ることができます。
                      </p>
                    </div>
                  </li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  意図的な感情誘発や再現性の高いアイデア開発をサポートし、ビジネス成果の向上に貢献します。
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative aspect-[4/3] w-full max-w-[550px] rounded-lg overflow-hidden shadow-lg">
                  <Image
                    src="/placeholder.svg?height=400&width=550"
                    alt="感性工学×AIの分析図"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* お客様の声 */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
              <div className="space-y-2 max-w-[800px]">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">お客様の声</h2>
                <p className="text-muted-foreground md:text-xl">
                  Auto N1 Interviewを導入されたお客様からのフィードバック
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
              <Card className="shadow-md h-full">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">田中 美咲</CardTitle>
                      <CardDescription>大手メーカー 人事部長</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    「採用プロセスの効率が劇的に向上しました。AIによる一次面接で候補者の基本的な適性を評価できるため、人事チームは最終選考に集中できるようになりました。」
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-md h-full">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">佐藤 健太</CardTitle>
                      <CardDescription>IT企業 製品開発マネージャー</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    「ユーザーフィードバックの収集と分析が格段に早くなりました。感性工学による分析は特に有用で、ユーザーが明示的に言及していない潜在的なニーズも把握できています。」
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-md h-full">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">山田 恵子</CardTitle>
                      <CardDescription>マーケティングリサーチャー</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    「市場調査の質と量が向上し、クライアントからの評価も高まりました。AIが一貫した質問と深掘りを行うため、従来の調査よりも豊富なデータが得られています。」
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* 料金プラン */}
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
              <div className="space-y-2 max-w-[800px]">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">シンプルな料金プラン</h2>
                <p className="text-muted-foreground md:text-xl">ニーズに合わせて選べる3つのプラン</p>
              </div>
            </div>
            <div className="w-full">
              <SelectSubscriptionPlans />
            </div>
          </div>
        </section>

        {/* 最終CTA */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-r from-blue-600 to-green-600 text-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-3 max-w-[800px]">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  今すぐAIインタビューを始めましょう
                </h2>
                <p className="text-white/90 md:text-xl">14日間の無料トライアル、クレジットカード不要</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <Button onClick={handleGetStarted} className="bg-white text-blue-600 hover:bg-white/90 px-8 py-6 text-lg font-medium">
                  インタビューを受ける
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button onClick={handleClientStarted} className="bg-white text-green-600 hover:bg-white/90 px-8 py-6 text-lg font-medium">
                  組織アカウント作成
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t py-8 bg-white dark:bg-slate-950">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-center text-sm text-muted-foreground md:text-left">
              &copy; {new Date().getFullYear()} Auto N1 Interview. kanseibunseki Inc.
            </p>
            <div className="flex gap-6">
              <Link href="/term/PrivacyPolicy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                プライバシーポリシー
              </Link>
              <Link href="/term/TermsOfService" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                利用規約
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                お問い合わせ
              </Link>
            </div>
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