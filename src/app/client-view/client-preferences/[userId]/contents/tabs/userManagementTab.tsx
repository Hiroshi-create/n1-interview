"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/context/components/ui/dialog"
import { Users, UserPlus, UserMinus, Shield, Search, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/context/components/ui/card"
import { Input } from "@/context/components/ui/input"
import { Button } from "@/context/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/context/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/context/components/ui/table"
import { Switch } from "@/context/components/ui/switch"
import { Label } from "@/context/components/ui/label"
import { User } from "@/stores/User"
import { format } from "date-fns"
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Separator } from "@/context/components/ui/separator"
import AddUserDialog from '../components/addUserDialog'
import { useEnterpriseSettings } from '../../contexts/enterpriseSettingsContext'

export function UserManagementTab() {
  const { userData, organizationData } = useEnterpriseSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<{
    email: string;
    password: string;
    userName: string[];
    role: string;
    gender: string;
    organizationPosition: string;
    userPhoneNumber: string;
  }>({
    email: '',
    password: '',
    userName: ['', ''],
    role: 'viewer',
    gender: '',
    organizationPosition: '',
    userPhoneNumber: ''
  });

  if (!userData) {
    return <div className="p-4 text-center">読み込み中...</div>
  }

  useEffect(() => {
    const fetchUsers = async () => {
      if (organizationData?.childUserIds) {
        const userPromises = organizationData.childUserIds.map(async (userId) => {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data() as Partial<User>;
            if (
              userData.email &&
              userData.userNickname &&
              userData.userName &&
              userData.createdAt &&
              userData.userId &&
              userData.role &&
              userData.status
            ) {
              return {
                ...userData,
                id: userDoc.id,
              } as User;
            }
          }
          return null;
        });
        const fetchedUsers = (await Promise.all(userPromises)).filter((user): user is User => user !== null);
        setUsers(fetchedUsers);
      }
    };
    fetchUsers();
  }, [organizationData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/client_preferences/userManagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organizationData?.organizationId,
          updatedUsers: users.map(user => ({
            userId: user.userId,
            role: user.role,
            dataAccessLevel: user.dataAccessLevel,
            featureAccess: user.featureAccess,
            status: user.status
          })),
          updatedOrganization: {
            childUserIds: users.map(user => user.userId)
          }
        }),
      });
      if (response.ok) {
        alert('ユーザー管理設定が更新されました');
      } else {
        throw new Error('ユーザー管理設定の更新に失敗しました');
      }
    } catch (error) {
      console.error('エラー:', error);
      alert('ユーザー管理設定の更新中にエラーが発生しました');
    }
  };

  const handleUserUpdate = async (updatedUser: User) => {
    try {
      const response = await fetch('/api/client_preferences/userManagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organizationData?.organizationId,
          updatedUsers: [updatedUser],
          updatedOrganization: {
            childUserIds: users.map(user => user.userId)
          }
        }),
      });
  
      if (response.ok) {
        setUsers(prevUsers => prevUsers.map(user => 
          user.userId === updatedUser.userId ? updatedUser : user
        ));
        setSelectedUser(null);
        alert('ユーザー設定が更新されました');
      } else {
        throw new Error('ユーザー設定の更新に失敗しました');
      }
    } catch (error) {
      console.error('エラー:', error);
      alert('ユーザー設定の更新中にエラーが発生しました');
    }
  };

  const filteredUsers = users.filter(user => 
    (user.userName && Array.isArray(user.userName) && user.userName.join(' ').toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddUser = async () => {
    try {
      if (!organizationData || !organizationData.organizationId) {
        throw new Error('組織データが見つかりません');
      }
  
      const response = await fetch('/api/auth/client_user_register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({newUser, organizationId: organizationData.organizationId}),
      });
  
      if (!response.ok) {
        throw new Error('ユーザー追加に失敗しました');
      }
  
      const addedUser = await response.json();
      setUsers(prevUsers => [...prevUsers, addedUser.user]);
      closeAddUserDialog();
    } catch (error) {
      console.error('ユーザー追加エラー:', error);
      // エラー処理を実装（例：エラーメッセージの表示）
    }
  };

  const showDeleteConfirmation = (user: User) => {
    setUserToDelete(user);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !organizationData) return;
    if (organizationData?.administratorId === userToDelete.userId) {
      alert('管理者アカウントは削除できません。');
      setUserToDelete(null);
      return;
    }
    try {
      const response = await fetch('/api/auth/user_delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: userToDelete,
          clientId: organizationData.organizationId,
        }),
      });
      
      const data = await response.json();
  
      if (response.ok) {
        setUsers(prevUsers => prevUsers.filter(user => user.userId !== userToDelete.userId));
        alert('ユーザーが削除されました');
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
          alert(errorMessage);
        } else if (response.status === 400) {
          alert(`入力エラー: ${data.error}`);
        } else {
          throw new Error(data.error || 'ユーザーの削除に失敗しました');
        }
      }
    } catch (error) {
      console.error('エラー:', error);
      alert(error instanceof Error ? error.message : 'ユーザーの削除中に予期せぬエラーが発生しました');
    } finally {
      setUserToDelete(null);
    }
  }

  const openAddUserDialog = () => {
    setIsDialogOpen(true)
  }

  const closeAddUserDialog = () => {
    setIsDialogOpen(false)
    setNewUser({
      email: '',
      password: '',
      userName: ['', ''],
      role: 'viewer',
      gender: '',
      organizationPosition: '',
      userPhoneNumber: ''
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">ユーザー管理</h3>
        <p className="text-sm text-muted-foreground">
          組織のユーザーを管理し、権限を設定します
        </p>
      </div>
      <Separator />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ユーザー検索と追加 */}
        <Card>
          <CardHeader>
            <CardTitle>ユーザー検索</CardTitle>
            <CardDescription>ユーザーを検索または新規追加します</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center space-x-2">
            <Input
              placeholder="ユーザーを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button type="button" onClick={openAddUserDialog}>
              <UserPlus className="mr-2 h-4 w-4" />
              ユーザーを追加
            </Button>

            <AddUserDialog
              isOpen={isDialogOpen}
              onClose={closeAddUserDialog}
              newUser={newUser}
              setNewUser={setNewUser}
              handleAddUser={handleAddUser}
            />
          </CardContent>
        </Card>

        {/* ユーザーリスト */}
        <Card>
          <CardHeader>
            <CardTitle>ユーザーリスト</CardTitle>
            <CardDescription>組織に所属するユーザーの一覧と管理</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>アクション</TableHead>
                  <TableHead>削除</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.userId}>
                    <TableCell>{user.userName.join(' ')}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) => {
                          setUsers(prevUsers => prevUsers.map(u => 
                            u.userId === user.userId ? { ...u, role: value } : u
                          ))
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">管理者</SelectItem>
                          <SelectItem value="editor">編集者</SelectItem>
                          <SelectItem value="viewer">閲覧者</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>
                      <Button type="button" variant="outline" onClick={() => setSelectedUser(user)}>
                        編集
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => showDeleteConfirmation(user)}
                        className="bg-white text-gray hover:bg-gray-200"
                      >
                        <Trash2 className="h-6 w-6" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* 確認ダイアログの部分 */}
                <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>ユーザーを削除</DialogTitle>
                    </DialogHeader>
                    {organizationData?.administratorId === userToDelete?.userId ? (
                      <p>管理者アカウントは削除できません。</p>
                    ) : (
                      <p>本当に {userToDelete?.userName.join(' ')} を削除しますか？この操作は取り消せません。</p>
                    )}
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setUserToDelete(null)}>キャンセル</Button>
                      {organizationData?.administratorId !== userToDelete?.userId && (
                        <Button variant="destructive" onClick={handleDeleteUser}>削除</Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ユーザー権限設定 */}
        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle>ユーザー権限設定</CardTitle>
              <CardDescription>{selectedUser.userName.join(' ')}の権限を編集します</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dataAccessLevel">データアクセスレベル</Label>
                  <Select
                    value={selectedUser.dataAccessLevel}
                    onValueChange={(value) => {
                      const updatedUser: User = {
                        ...selectedUser,
                        dataAccessLevel: value
                      };
                      setSelectedUser(updatedUser);
                      handleUserUpdate(updatedUser);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="アクセスレベルを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">フルアクセス</SelectItem>
                      <SelectItem value="restricted">制限付きアクセス</SelectItem>
                      <SelectItem value="readonly">閲覧のみ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* <div>
                  <Label>機能アクセス</Label>
                  {selectedUser.featureAccess.map(feature => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Switch
                        checked={selectedUser.featureAccess.includes(feature)}
                        onCheckedChange={(checked) => {
                          const updatedFeatures = checked
                            ? [...selectedUser.featureAccess, feature]
                            : selectedUser.featureAccess.filter(f => f !== feature);
                          const updatedUser: User = {
                            ...selectedUser,
                            featureAccess: updatedFeatures
                          };
                          setSelectedUser(updatedUser);
                          handleUserUpdate(updatedUser);
                        }}
                      />
                      <Label>{feature}</Label>
                    </div>
                  ))}
                </div> */}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setSelectedUser(null)}>閉じる</Button>
            </CardFooter>
          </Card>
        )}

        {/* ユーザーオンボーディング */}
        {/* <Card>
          <CardHeader>
            <CardTitle>ユーザーオンボーディング</CardTitle>
            <CardDescription>新規ユーザーの導入支援ツール</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button type="button" variant="outline">ウェルカムメール送信</Button>
            <Button type="button" variant="outline">トレーニング資料を共有</Button>
          </CardContent>
        </Card> */}

        {/* ユーザー監査 */}
        <Card>
          <CardHeader>
            <CardTitle>ユーザー監査</CardTitle>
            <CardDescription>ユーザーアクティビティの監査と報告</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              最終ユーザー監査: {
                organizationData?.lastAuditDate.user instanceof Timestamp
                ? format(organizationData.lastAuditDate.user.toDate(), "yyyy/MM/dd HH:mm")
                : 'N/A'
              }
            </p>
            <Button type="button" variant="outline">監査レポートを表示</Button>
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
