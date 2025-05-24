"use client"

import { useState, useEffect } from 'react'
import { CreditCard, Package, Receipt, Calendar, Download, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/context/components/ui/card"
import { Input } from "@/context/components/ui/input"
import { Button } from "@/context/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/context/components/ui/select"
import { Switch } from "@/context/components/ui/switch"
import { Label } from "@/context/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/context/components/ui/table"
import { Progress } from "@/context/components/ui/progress"
import { Separator } from "@/context/components/ui/separator"
import { Client } from "@/stores/Client"
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAppsContext } from '@/context/AppContext'
import { db } from '@/lib/firebase'
import { useEnterpriseSettings } from '../../contexts/enterpriseSettingsContext'

export function BillingSubscriptionTab() {
  const router = useRouter();
  const { userId } = useAppsContext();
  const { organizationData } = useEnterpriseSettings();
  const [formData, setFormData] = useState<Client | null>(null);
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    if (organizationData) {
      setFormData(organizationData)
    }
  }, [organizationData]);

  useEffect(() => {
    const fetchPlanName = async () => {
      if (formData && formData.subscriptionProductId) { // formDataがnullでないことを確認
        const plansRef = collection(db, 'subscriptionPlans');
        const q = query(plansRef, where('subscriptionProductId', '==', formData.subscriptionProductId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setPlanName(querySnapshot.docs[0].data().planName);
        }
      }
    };
  
    fetchPlanName();
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      if (!prev) return null
      const keys = name.split('.')
      if (keys.length === 1) {
        return { ...prev, [name]: value }
      } else {
        const [parentKey, childKey] = keys
        const parentValue = prev[parentKey as keyof Client]
        if (typeof parentValue === 'object' && parentValue !== null) {
          return {
            ...prev,
            [parentKey]: {
              ...parentValue,
              [childKey]: value
            }
          }
        }
        return prev
      }
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => {
      if (!prev) return null
      const keys = name.split('.')
      if (keys.length === 1) {
        return { ...prev, [name]: value }
      } else {
        const [parentKey, childKey] = keys
        const parentValue = prev[parentKey as keyof Client]
        if (typeof parentValue === 'object' && parentValue !== null) {
          return {
            ...prev,
            [parentKey]: {
              ...parentValue,
              [childKey]: value
            }
          }
        }
        return prev
      }
    })
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => {
      if (!prev) return null
      return { ...prev, [name]: checked }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/client_preferences/billingSubscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: formData?.organizationId,
          updatedData: formData,
        }),
      })
      if (response.ok) {
        alert('請求と契約設定が更新されました')
      } else {
        throw new Error('設定の更新に失敗しました')
      }
    } catch (error) {
      console.error('エラー:', error)
      alert('設定の更新中にエラーが発生しました')
    }
  }

  const handlePlanChange = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/client-view/${userId}/subscriptions`);
  };

  const cancellingSubscription = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (organizationData?.subscriptionStatus === "active") {
      try {
        const response = await fetch('/api/stripe_portal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          router.push(data.url);
        } else {
          throw new Error('サブスクリプションの更新に失敗しました');
        }
      } catch (error) {
        console.error('エラー:', error);
        alert('サブスクリプションの更新中にエラーが発生しました');
      }
    }
  }

  if (!formData) {
    return <div>読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">請求と契約</h3>
        <p className="text-sm text-muted-foreground">
          サブスクリプションプランと請求情報を管理します
        </p>
      </div>
      <Separator />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 現在のプラン */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              現在のプラン
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <h3 className="text-lg font-semibold">
                  {formData.subscriptionStatus === "active" ? planName + " プラン" : (formData.subscriptionProductId ? "読み込み中..." : "サブスクリプションにまだ加入していません")}
                </h3>
                {formData.subscriptionStatus === "active" && (
                  <p className="text-sm text-gray-500">
                    年間契約 - 更新日: {
                      formData.subscriptionRenewalDate instanceof Timestamp
                      ? format(formData.subscriptionRenewalDate.toDate(), "yyyy/MM/dd")
                      : 'N/A'
                    }
                  </p>
                )}
              </div>
              <div>
                <span className={`px-2 py-1 text-sm font-semibold rounded-full
                  ${formData.subscriptionStatus === "active" ? "bg-green-100 text-green-800" :
                    formData.subscriptionStatus === "inactive" ? "bg-orange-100 text-orange-800" : ""}`}
                >
                  {formData.subscriptionStatus}
                </span>
              </div>
            </div>
            <Button
              onClick={handlePlanChange}
              variant={`${formData.subscriptionStatus === "active" ? "outline" :
                          formData.subscriptionStatus === "inactive" ? "destructive" : "outline"}`}
            >
              {formData.subscriptionStatus === "active" ? "プランを変更" : formData.subscriptionStatus === "inactive" ? "プランに加入" : ""}
            </Button>
          </CardContent>
        </Card>

        {/* 利用状況 */}
        <Card>
          <CardHeader>
            <CardTitle>利用状況</CardTitle>
            <CardDescription>現在の利用状況と制限</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>ユーザー数: {formData.childUserIds.length} / {formData.usageQuota?.users}</span>
                <span>{Math.round((formData.childUserIds.length / formData.usageQuota?.users) * 100)}% 使用中</span>
              </div>
              <Progress value={(formData.childUserIds.length / formData.usageQuota?.users) * 100} className="w-full" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span>ストレージ: {formData.usageQuota?.storage}GB / 500GB</span>
                <span>{Math.round((formData.usageQuota?.storage / 500) * 100)}% 使用中</span>
              </div>
              <Progress value={(formData.usageQuota?.storage / 500) * 100} className="w-full" />
            </div>
          </CardContent>
        </Card>

        {/* 請求情報 */}
        <Card>
            <CardHeader>
              <CardTitle>請求情報</CardTitle>
              <CardDescription>請求先情報と支払い方法</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* <p>キャンセル後も、顧客は請求期間の終了まではサブスクリプションを更新できます。</p> */}
              <Button variant="outline" onClick={cancellingSubscription}>請求情報を編集</Button>
            </CardContent>
          </Card>
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              請求情報
            </CardTitle>
            <CardDescription>請求先情報と支払い方法</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">請求先会社名</Label>
                <Input
                  id="companyName"
                  name="billingInfo.companyName"
                  value={formData.billingInfo?.companyName || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">請求先メールアドレス</Label>
                <Input
                  id="email"
                  name="billingInfo.email"
                  value={formData.billingInfo?.email || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">請求先住所</Label>
                <Input
                  id="address"
                  name="billingInfo.address"
                  value={formData.billingInfo?.address || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label>支払い方法</Label>
                <Select
                  value={formData.billingInfo?.paymentMethod || ''}
                  onValueChange={(value) => handleSelectChange('billingInfo.paymentMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">クレジットカード</SelectItem>
                    <SelectItem value="bank_transfer">銀行振込</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* 支払い履歴 */}
        <Card>
          <CardHeader>
            <CardTitle>支払い履歴</CardTitle>
            <CardDescription>過去の支払い記録</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>請求書</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>2025-02-01</TableCell>
                  <TableCell>¥500,000</TableCell>
                  <TableCell>支払い済み</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      ダウンロード
                    </Button>
                  </TableCell>
                </TableRow>
                {/* 他の支払い履歴行 */}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 解約予告 */}
        {organizationData?.subscriptionStatus === "active" && (
          <Card>
            <CardHeader>
              <CardTitle>解約予告</CardTitle>
              <CardDescription>契約解約に関する情報</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>キャンセル後も、顧客は請求期間の終了まではサブスクリプションを更新できます。</p>
              <Button variant="destructive" onClick={cancellingSubscription}>解約手続きを開始</Button>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">
            変更を破棄
          </Button>
          <Button type="submit">設定を保存</Button>
        </div>
      </form>
    </div>
  )
}
