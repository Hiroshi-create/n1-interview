"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrganizationSettingsTab } from "./contents/tabs/organizationSettingsTab"
import { UserManagementTab } from "./contents/tabs/userManagementTab"
import { SecurityComplianceTab } from "./contents/tabs/securityComplianceTab"
import { BillingSubscriptionTab } from "./contents/tabs/billingSubscriptionTab"
import { useAppsContext } from "@/context/AppContext"
import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { UserSettingsTab } from "./contents/tabs/userSettingsTab"
import { User } from "@/stores/User"
import { Client } from "@/stores/Client"
import { useLastVisitedUrl } from "@/context/hooks/useLastVisitedUrl"

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


type EnterpriseSettingsContextType = {
  userData: User | null
  organizationData: Client | null
  loading: boolean
  error: Error | null
  refreshData: () => Promise<void>
}

const EnterpriseSettingsContext = createContext<EnterpriseSettingsContextType | null>(null)

export const EnterpriseSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { userId } = useAppsContext()
  const [userData, setUserData] = useState<User | null>(null)
  const [organizationData, setOrganizationData] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    if (!userId) return
    try {
      setLoading(true)
      const userDocRef = doc(db, 'users', userId)
      const userDocSnap = await getDoc(userDocRef)
      
      if (userDocSnap.exists()) {
        const user = userDocSnap.data() as User
        setUserData(user)
        
        if (user.inOrganization && user.organizationId) {
          const orgDocRef = doc(db, 'clients', user.organizationId)
          const orgDocSnap = await getDoc(orgDocRef)
          orgDocSnap.exists() && setOrganizationData(orgDocSnap.data() as Client)
        }
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  return (
    <EnterpriseSettingsContext.Provider
      value={{ userData, organizationData, loading, error, refreshData: fetchData }}
    >
      {children}
    </EnterpriseSettingsContext.Provider>
  )
}

export const useEnterpriseSettings = () => {
  const context = useContext(EnterpriseSettingsContext)
  if (!context) {
    throw new Error('useEnterpriseSettings は EnterpriseSettingsProvider 内で使用する必要があります')
  }
  return context
}

export default function EnterpriseSettings() {
  return (
    <EnterpriseSettingsProvider>
      <EnterpriseSettingsContent />
    </EnterpriseSettingsProvider>
  )
}