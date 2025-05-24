"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrganizationSettingsTab } from "./contents/tabs/organizationSettingsTab"
import { UserManagementTab } from "./contents/tabs/userManagementTab"
import { SecurityComplianceTab } from "./contents/tabs/securityComplianceTab"
import { BillingSubscriptionTab } from "./contents/tabs/billingSubscriptionTab"
import { UserSettingsTab } from "./contents/tabs/userSettingsTab"
import { useLastVisitedUrl } from "@/context/hooks/useLastVisitedUrl"
import { EnterpriseSettingsProvider, useEnterpriseSettings } from "./contexts/enterpriseSettingsContext"

type TabConfig = {
  value: string
  label: string
  component: React.ReactNode
  forOrganization: boolean
}

const tabConfigs: TabConfig[] = [
  {
    value: "user_setting",
    label: "ユーザー設定",
    component: <UserSettingsTab />,
    forOrganization: false
  },
  {
    value: "organization",
    label: "組織設定",
    component: <OrganizationSettingsTab />,
    forOrganization: true
  },
  {
    value: "user_management",
    label: "ユーザー管理",
    component: <UserManagementTab />,
    forOrganization: true
  },
  {
    value: "security",
    label: "セキュリティとコンプライアンス",
    component: <SecurityComplianceTab />,
    forOrganization: true
  },
  {
    value: "billing",
    label: "請求と契約",
    component: <BillingSubscriptionTab />,
    forOrganization: true
  },
]

function EnterpriseSettingsContent() {
  const { userData, loading, error } = useEnterpriseSettings();
  
  useLastVisitedUrl();

  if (loading) return <div>読み込み中...</div>
  if (error) return <div>エラーが発生しました: {error.message}</div>

  const inOrganization = userData?.inOrganization || false
  const displayedTabs = tabConfigs.filter(tab => 
    !tab.forOrganization || (tab.forOrganization && inOrganization)
  )

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-semibold mb-6">設定</h1>
      <Tabs defaultValue={displayedTabs[0].value} className="space-y-6">
        <TabsList className="w-full justify-start border-b pb-px h-auto bg-transparent p-0 space-x-6">
          {displayedTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:border-primary border-b-2 border-transparent pb-2 rounded-none bg-transparent"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {displayedTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-8">
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default function EnterpriseSettings() {
  return (
    <EnterpriseSettingsProvider>
      <EnterpriseSettingsContent />
    </EnterpriseSettingsProvider>
  )
}