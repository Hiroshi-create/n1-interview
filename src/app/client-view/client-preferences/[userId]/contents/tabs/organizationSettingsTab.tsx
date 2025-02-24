"use client"

import { useEffect, useState } from 'react';
import { Users, Shield, FileText } from "lucide-react"
import { Button } from "@/context/components/ui/button"
import { Input } from "@/context/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/context/components/ui/card"
import { Label } from "@/context/components/ui/label"
import { Switch } from "@/context/components/ui/switch"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/context/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/context/components/ui/table"
import { useAppsContext } from "@/context/AppContext"
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from "date-fns"
import { Separator } from "@/context/components/ui/separator"
import { Client } from '@/stores/Client';
import { organizationTypes } from '@/context/components/lists';

export function OrganizationSettingsTab() {
  const { userId } = useAppsContext();
  const [inOrganization, setInOrganization] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<Client | null>(null);

  useEffect(() => {
    const checkUserOrganization = async () => {
      if (!userId) return;
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setInOrganization(userData.inOrganization);
        if (userData.inOrganization && userData.organizationId) {
          const orgDocRef = doc(db, "clients", userData.organizationId);
          const orgDocSnap = await getDoc(orgDocRef);
          if (orgDocSnap.exists()) {
            setFormData(orgDocSnap.data() as Client);
          }
        }
      } else {
        setInOrganization(false);
      }
    };
    checkUserOrganization();
  }, [userId]);

  if (inOrganization === null || !formData) {
    return <div className="p-4 text-center">読み込み中...</div>;
  }

  if (!inOrganization) {
    return <div className="p-4 text-center">組織に属していないユーザーです。</div>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (!prev) return null;
      return { ...prev, [name]: value } as Client;
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => {
      if (!prev) return null;
      return { ...prev, [name]: value } as Client;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/client_preferences/organizationSettings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: formData.organizationId,
          updatedData: formData
        }),
      });
      if (response.ok) {
        alert('組織設定が更新されました');
      } else {
        throw new Error('組織設定の更新に失敗しました');
      }
    } catch (error) {
      console.error('エラー:', error);
      alert('組織設定の更新中にエラーが発生しました');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">企業アカウント管理</h3>
        <p className="text-sm text-muted-foreground">
          組織の基本情報とセキュリティ設定を管理します
        </p>
      </div>
      <Separator />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 企業情報セクション */}
        <Card>
          <CardHeader>
            <CardTitle>企業基本情報</CardTitle>
            <CardDescription>組織の基本的な情報を更新します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">企業名</Label>
              <Input
                id="organizationName"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationType">業種</Label>
              <Select
              value={formData.organizationType}
              onValueChange={(value) => handleSelectChange('organizationType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="組織タイプを選択" />
              </SelectTrigger>
              <SelectContent>
                {organizationTypes.map((group) => (
                  'options' in group ? (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  )
                ))}
              </SelectContent>
            </Select>
            </div>
          </CardContent>
        </Card>

        {/* セキュリティ設定 */}
        <Card>
          <CardHeader>
            <CardTitle>セキュリティ設定</CardTitle>
            <CardDescription>組織全体のセキュリティ設定を管理します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="twoFactorAuth">二段階認証</Label>
                <p className="text-sm text-muted-foreground">全ユーザーに二段階認証を強制します</p>
              </div>
              <Switch
                id="twoFactorAuth"
                checked={formData.securitySettings.twoFactorAuth}
                onCheckedChange={(checked) => setFormData(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    securitySettings: { 
                      ...prev.securitySettings, 
                      twoFactorAuth: checked 
                    }
                  } as Client;
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">セッションタイムアウト</Label>
              <Select
                value={formData.securitySettings.sessionTimeout.toString()}
                onValueChange={(value) => setFormData(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    securitySettings: { 
                      ...prev.securitySettings, 
                      sessionTimeout: parseInt(value) 
                    }
                  } as Client;
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1800">30分</SelectItem>
                  <SelectItem value="3600">1時間</SelectItem>
                  <SelectItem value="7200">2時間</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 監査ログ */}
        <Card>
          <CardHeader>
            <CardTitle>アクティビティログ</CardTitle>
            <CardDescription>組織の最近のアクティビティを確認します</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              最終監査日: {
                formData?.lastAuditDate.organization instanceof Timestamp
                ? format(formData.lastAuditDate.organization.toDate(), "yyyy/MM/dd HH:mm")
                : 'N/A'
              }
            </p>
            <Button variant="outline" className="mt-2">詳細を表示</Button>
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
  );
}
