"use client"

import { Puzzle, Link, Key, RefreshCw, Plus, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/context/components/ui/card"
import { Input } from "@/context/components/ui/input"
import { Button } from "@/context/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/context/components/ui/select"
import { Switch } from "@/context/components/ui/switch"
import { Label } from "@/context/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/context/components/ui/table"

export function IntegrationsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          連携とAPI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* 外部サービス連携 */}
        <div className="space-y-4">
          <Label className="text-base flex items-center gap-2">
            <Link className="h-4 w-4" />
            外部サービス連携
          </Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>サービス名</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>最終同期</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Salesforce</TableCell>
                <TableCell className="text-green-500">連携済み</TableCell>
                <TableCell>2025-02-08 15:30</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="mr-2">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    同期
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500">
                    <X className="h-4 w-4 mr-2" />
                    解除
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Google Workspace</TableCell>
                <TableCell className="text-yellow-500">未連携</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="text-blue-500">
                    <Plus className="h-4 w-4 mr-2" />
                    連携
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Button className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            新規連携を追加
          </Button>
        </div>

        {/* API設定 */}
        <div className="space-y-4">
          <Label className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            API設定
          </Label>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>APIキー</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" value="••••••••••••••••" readOnly className="w-64" />
                  <Button variant="outline">表示</Button>
                  <Button variant="outline">再生成</Button>
                </div>
              </div>
              <div>
                <Label>APIアクセス</Label>
                <div className="flex items-center gap-2">
                  <Switch id="api-access" defaultChecked />
                  <Label htmlFor="api-access">有効</Label>
                </div>
              </div>
            </div>
            <div>
              <Label>APIリクエスト制限</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input type="number" defaultValue="1000" className="w-24" />
                <span>リクエスト / 分</span>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook設定 */}
        <div className="space-y-4">
          <Label className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Webhook設定
          </Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>イベント</TableHead>
                <TableHead>エンドポイントURL</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>ユーザー作成</TableCell>
                <TableCell>https://example.com/webhook/user-created</TableCell>
                <TableCell>
                  <Check className="h-4 w-4 text-green-500" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">編集</Button>
                  <Button variant="ghost" size="sm" className="text-red-500">削除</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新規Webhookを追加
          </Button>
        </div>

        {/* データエクスポート */}
        <div className="space-y-4">
          <Label className="text-base">データエクスポート</Label>
          <div className="flex items-center gap-4">
            <Select defaultValue="json">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="フォーマットを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
              </SelectContent>
            </Select>
            <Button>エクスポート開始</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
