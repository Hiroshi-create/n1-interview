"use client"

import { useState, useEffect } from 'react'
import { Shield, Lock, FileText, AlertTriangle, Activity, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/context/components/ui/card"
import { Input } from "@/context/components/ui/input"
import { Button } from "@/context/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/context/components/ui/select"
import { Switch } from "@/context/components/ui/switch"
import { Label } from "@/context/components/ui/label"
import { Separator } from "@/context/components/ui/separator"
import { Client } from "@/stores/Client"
import { Progress } from '@/context/components/ui/progress'
import { Timestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { useEnterpriseSettings } from '../../contexts/enterpriseSettingsContext'

export function SecurityComplianceTab() {
  const { organizationData } = useEnterpriseSettings();
  const [formData, setFormData] = useState<Client | null>(null);

  useEffect(() => {
    if (organizationData) {
      setFormData(organizationData)
    }
  }, [organizationData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      if (!prev) return null
      const [parentKey, childKey] = name.split('.')
      return {
        ...prev,
        [parentKey]: {
          ...(prev[parentKey as keyof Client] as Record<string, unknown>),
          [childKey]: value
        }
      } as Client
    })
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => {
      if (!prev) return null;
      const [parentKey, childKey] = name.split('.');
      return {
        ...prev,
        [parentKey]: {
          ...(prev[parentKey as keyof Client] as Record<string, unknown>),
          [childKey]: checked
        }
      } as Client;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/client_preferences/securityCompliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organizationData?.organizationId,
          updatedData: formData
        }),
      })
      if (response.ok) {
        alert('セキュリティとコンプライアンス設定が更新されました')
      } else {
        throw new Error('設定の更新に失敗しました')
      }
    } catch (error) {
      console.error('エラー:', error)
      alert('設定の更新中にエラーが発生しました')
    }
  }

  if (!formData) {
    return <div className="p-4 text-center">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">セキュリティとコンプライアンス</h3>
        <p className="text-sm text-muted-foreground">
          組織のセキュリティ設定とコンプライアンス要件を管理します
        </p>
      </div>
      <Separator />

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>セキュリティ設定</CardTitle>
            <CardDescription>組織のセキュリティポリシーを設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>二段階認証</Label>
                <p className="text-sm text-muted-foreground">全ユーザーに二段階認証を要求します</p>
              </div>
              <Switch
                checked={formData.securitySettings?.twoFactorAuth}
                onCheckedChange={(checked) => handleSwitchChange('securitySettings.twoFactorAuth', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">セッションタイムアウト (秒)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                name="securitySettings.sessionTimeout"
                value={formData.securitySettings?.sessionTimeout}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>コンプライアンス状態</CardTitle>
            <CardDescription>組織のコンプライアンス状態を管理します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>GDPR準拠</Label>
                <p className="text-sm text-muted-foreground">EU一般データ保護規則に準拠します</p>
              </div>
              <Switch
                checked={formData.complianceStatus?.gdpr}
                onCheckedChange={(checked) => handleSwitchChange('complianceStatus.gdpr', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>HIPAA準拠</Label>
                <p className="text-sm text-muted-foreground">米国医療保険の相互運用性と説明責任に関する法律に準拠します</p>
              </div>
              <Switch
                checked={formData.complianceStatus?.hipaa}
                onCheckedChange={(checked) => handleSwitchChange('complianceStatus.hipaa', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>ISO 27001準拠</Label>
                <p className="text-sm text-muted-foreground">情報セキュリティマネジメントシステムの国際規格に準拠します</p>
              </div>
              <Switch
                checked={formData.complianceStatus?.iso27001}
                onCheckedChange={(checked) => handleSwitchChange('complianceStatus.iso27001', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>セキュリティ監査</CardTitle>
            <CardDescription>セキュリティ監査情報とスコアを表示します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                アクセス監査
              </Label>
              <div className="rounded border p-4">
                <div className="flex justify-between items-center">
                  <span>
                    最終監査: {
                      formData.lastAuditDate?.security instanceof Timestamp
                      ? format(formData.lastAuditDate.security.toDate(), "yyyy/MM/dd HH:mm")
                      : 'N/A'
                    }
                  </span>
                  <Button variant="outline">監査ログを表示</Button>
                </div>
              </div>
            </div>

            {/* <div className="space-y-4">
              <Label className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                セキュリティスコア
              </Label>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>現在のスコア: {formData.securityScore}/100</span>
                  <Button variant="link">改善方法を表示</Button>
                </div>
                <Progress value={formData.securityScore} className="w-full" />
              </div>
            </div> */}
          </CardContent>
        </Card>

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
