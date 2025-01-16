import { Database, FileCode2, Files, Plus, Server, Users } from "lucide-react";


export const positions = [
    "経営者・役員", "部長", "課長", "係長・主任", "一般社員", "契約・嘱託・派遣等", "個人", "その他"
]

export const countries = [
    "日本", "アメリカ", "中国", "イギリス", "フランス", "ドイツ", "カナダ", "オーストラリア", "その他"
]

export const languages = [
    "日本語", "英語", "中国語", "フランス語", "ドイツ語", "スペイン語", "その他"
]

export const organizationTypes = [
  {
    label: '法人',
    options: [
      { value: 'corporation_stock', label: '株式会社' },
      { value: 'corporation_llc', label: '合同会社（LLC）' },
      { value: 'corporation_limited', label: '合資会社' },
      { value: 'corporation_general', label: '合名会社' }
    ]
  },
  { value: 'sole_proprietorship', label: '個人事業主' },
  {
    label: 'その他の組織タイプ',
    options: [
      { value: 'association', label: '一般社団法人' },
      { value: 'foundation', label: '一般財団法人' },
      { value: 'npo', label: 'NPO法人（特定非営利活動法人）' },
      { value: 'public_interest', label: '公益社団法人・公益財団法人' },
      { value: 'independent_admin', label: '独立行政法人' },
      { value: 'local_government', label: '地方公共団体' },
      { value: 'educational', label: '学校法人' },
      { value: 'medical', label: '医療法人' },
      { value: 'religious', label: '宗教法人' }
    ]
  }
];

export const mainNav = [
  {
    title: "インタビューを追加",
    icon: Plus,
    href: "/client-view/[userId]/AddTheme",
    isActive: false,
  },
  {
    title: "Report",
    icon: Files,
    href: "/client-view/[userId]/Report",
    isActive: true,
  },
]

export const analysisNav = [
  {
    title: "パターンA",
    icon: Users,
    href: "/client-view/[userId]/patternA",
    isActive: false,
  },
  {
    title: "パターンB", 
    icon: Database,
    href: "/client-view/[userId]/patternB",
    isActive: false,
  },
  {
    title: "パターンC",
    icon: Server,
    href: "/client-view/[userId]/patternC",
    isActive: false,
  },
  {
    title: "パターンD",
    icon: FileCode2,
    href: "/client-view/[userId]/patternD",
    isActive: false,
  },
]