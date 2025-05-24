"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useAppsContext } from "@/context/AppContext"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { User } from "@/stores/User"
import { Client } from "@/stores/Client"

type EnterpriseSettingsContextType = {
  userData: User | null
  organizationData: Client | null
  loading: boolean
  error: Error | null
  refreshData: () => Promise<void>
}

const EnterpriseSettingsContext = createContext<EnterpriseSettingsContextType | null>(null)

export function EnterpriseSettingsProvider({ children }: { children: React.ReactNode }) {
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

export function useEnterpriseSettings() {
  const context = useContext(EnterpriseSettingsContext)
  if (!context) {
    throw new Error('useEnterpriseSettings は EnterpriseSettingsProvider 内で使用する必要があります')
  }
  return context
}
