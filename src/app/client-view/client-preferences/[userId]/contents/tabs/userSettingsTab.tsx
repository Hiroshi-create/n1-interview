"use client"

import { Users, Mail, Bell, Lock, Trash2, Shield, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/context/components/ui/card"
import { Input } from "@/context/components/ui/input"
import { Button } from "@/context/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/context/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/context/components/ui/table"
import { Switch } from "@/context/components/ui/switch"
import { Label } from "@/context/components/ui/label"
import { format } from "date-fns"
import { Separator } from "@/context/components/ui/separator"
import { useEffect, useState } from "react"
import { Timestamp } from "firebase/firestore"
import { User } from "@/stores/User"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/context/components/ui/dialog"
import { useEnterpriseSettings } from "../../contexts/enterpriseSettingsContext"
import { useToast } from '@/context/ToastContext'
import { LoadingButton } from '@/context/components/ui/loading'

type UserWithStringTimestamp = Omit<User, 'userBirthday'> & {
  userBirthday: string;
};

export function UserSettingsTab() {
  const { userData, organizationData } = useEnterpriseSettings();
  const toast = useToast();
  const [inOrganization, setInOrganization] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<UserWithStringTimestamp | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (userData) {
      setInOrganization(userData.inOrganization)
      setFormData({
        ...userData,
        userBirthday: userData.userBirthday instanceof Timestamp
          ? userData.userBirthday.toDate().toISOString().split('T')[0]
          : ''
      } as UserWithStringTimestamp)
    }
  }, [userData])

  if (inOrganization === null || !userData || !formData) {
    return <div className="p-4 text-center">読み込み中...</div>
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      if (!prev) return null
      if (name === 'userBirthday') {
        // ISO 8601形式の文字列に変換
        const isoDate = new Date(value).toISOString().split('T')[0]
        return { ...prev, [name]: isoDate } as UserWithStringTimestamp
      }
      return { ...prev, [name]: value } as UserWithStringTimestamp
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true);
    try {
      const response = await fetch('/api/client_preferences/userSettings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.userId,
          updatedData: {
            ...formData,
          }
        }),
      })
      if (response.ok) {
        toast.success('設定が更新されました');
      } else {
        throw new Error('設定の更新に失敗しました');
      }
    } catch (error) {
      console.error('エラー:', error);
      toast.error('設定の更新中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }

  const showDeleteConfirmation = (e: React.MouseEvent) => {
    e.preventDefault();
    setUserToDelete(userData);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !organizationData) return;
    if (userToDelete.inOrganization) {
      toast.error('組織に属したアカウントはここから削除できません');
      setUserToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch('/api/auth/user_delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: userToDelete,
        }),
      });
      
      const data = await response.json();
  
      if (response.ok) {
        toast.success('ユーザーが削除されました');
      } else {
        if (response.status === 403) {
          const failedConditions = data.failedConditions || [];
          let errorMessage = '削除条件を満たしていません:\n';
          failedConditions.forEach((condition: string) => {
            switch (condition) {
              case 'organizationMatch':
                errorMessage += '- ユーザーの組織IDが一致しません\n';
                break;
              case 'notAdministrator':
                errorMessage += '- このユーザーは管理者です\n';
                break;
              case 'inChildUserIds':
                errorMessage += '- ユーザーが組織の子ユーザーリストに含まれていません\n';
                break;
              default:
                errorMessage += `- ${condition}\n`;
            }
          });
          toast.error('削除条件を満たしていません', errorMessage);
        } else if (response.status === 400) {
          toast.error('入力エラー', data.error);
        } else {
          throw new Error(data.error || 'ユーザーの削除に失敗しました');
        }
      }
    } catch (error) {
      console.error('エラー:', error);
      toast.error('ユーザーの削除中にエラーが発生しました', error instanceof Error ? error.message : '予期せぬエラーが発生しました');
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">アカウント設定</h3>
        <p className="text-sm text-muted-foreground">
          個人情報とセキュリティ設定を管理します
        </p>
      </div>
      <Separator />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本情報セクション */}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>アカウントの基本情報を更新します</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>氏名</Label>
              <Input
                value={formData.userName.join(' ')}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  userName: e.target.value.split(' ')
                } as UserWithStringTimestamp))}
              />
            </div>
            <div className="space-y-2">
              <Label>ニックネーム</Label>
              <Input
                value={formData.userNickname}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  userNickname: e.target.value
                } as UserWithStringTimestamp))}
              />
            </div>
            <div className="space-y-2">
              <Label>性別</Label>
              <Select
                value={formData.gender}
                onValueChange={value => setFormData(prev => ({
                  ...prev,
                  gender: value
                } as UserWithStringTimestamp))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                  <SelectItem value="not_specified">回答しない</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>生年月日</Label>
              <Input
                id="userBirthday"
                name="userBirthday"
                type="date"
                value={formData.userBirthday}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* 連絡先情報 */}
        <Card>
          <CardHeader>
            <CardTitle>連絡先情報</CardTitle>
            <CardDescription>連絡先情報を管理します</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>メールアドレス</Label>
              <Input
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input
                type="tel"
                value={formData.userPhoneNumber?.toString() ?? ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  userPhoneNumber: e.target.value,
                } as UserWithStringTimestamp))}
              />
            </div>
          </CardContent>
        </Card>

        {/* セキュリティ設定 */}
        <Card>
          <CardHeader>
            <CardTitle>セキュリティ</CardTitle>
            <CardDescription>アカウントのセキュリティ設定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label>二段階認証</Label>
                <p className="text-sm text-muted-foreground">
                  アカウントのセキュリティを強化します
                </p>
              </div>
              <Switch
                checked={formData.twoFactorAuthEnabled}
                onCheckedChange={checked => setFormData(prev => ({
                  ...prev,
                  twoFactorAuthEnabled: checked
                } as UserWithStringTimestamp))}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label>最終ログイン</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.lastLoginAt instanceof Timestamp
                    ? format(formData.lastLoginAt.toDate(), "yyyy/MM/dd HH:mm")
                    : 'N/A'
                  }
                </p>
              </div>
              <Button variant="outline">ログイン履歴を確認</Button>
            </div>
          </CardContent>
        </Card>

        {/* 通知設定 */}
        {/* <Card>
          <CardHeader>
            <CardTitle>通知設定</CardTitle>
            <CardDescription>通知の受信方法を設定します</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>メール通知</Label>
              <Select
                value={formData.notificationPreferences.email ? "enabled" : "disabled"}
                onValueChange={value => handleSelectChange('email', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">有効</SelectItem>
                  <SelectItem value="disabled">無効</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>アプリ内通知</Label>
              <Select
                value={formData.notificationPreferences.inApp ? "enabled" : "disabled"}
                onValueChange={value => handleSelectChange('inApp', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">有効</SelectItem>
                  <SelectItem value="disabled">無効</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card> */}

        {/* 組織情報 */}
        {inOrganization && organizationData && (
          <Card>
            <CardHeader>
              <CardTitle>組織情報</CardTitle>
              <CardDescription>所属組織の情報</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>組織名</Label>
                <Input value={organizationData.organizationName} disabled />
              </div>
              <div className="space-y-2">
                <Label>組織内権限</Label>
                <Input value={formData.role} disabled />
              </div>
            </CardContent>
          </Card>
        )}

        {/* アカウント操作 */}
        <Card>
          <CardHeader>
            <CardTitle>アカウント操作</CardTitle>
            <CardDescription>アカウントに関する重要な操作</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button variant="outline" className="justify-start" onClick={showDeleteConfirmation}>
              <Trash2 className="mr-2 h-4 w-4" />
              アカウントを削除
            </Button>
            <Button variant="outline" className="justify-start">
              <Activity className="mr-2 h-4 w-4" />
              データをエクスポート
            </Button>
          </CardContent>
        </Card>

        {/* 確認ダイアログの部分 */}
        <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ユーザーを削除</DialogTitle>
            </DialogHeader>
            {userToDelete?.inOrganization ? (
              <>
                <p>組織に属したアカウントはここから削除できません。</p>
                <p>管理者がユーザー管理タブから行えます。</p>
              </>
            ) : (
              <p>本当に {userToDelete?.userName.join(' ')} を削除しますか？この操作は取り消せません。</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setUserToDelete(null)}>キャンセル</Button>
              {organizationData?.administratorId !== userToDelete?.userId && (
                <LoadingButton variant="destructive" loading={isDeleting} loadingText="削除中..." onClick={handleDeleteUser}>削除</LoadingButton>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">
            変更を破棄
          </Button>
          <LoadingButton type="submit" loading={isLoading} loadingText="保存中...">設定を保存</LoadingButton>
        </div>
      </form>
    </div>
  )
}
