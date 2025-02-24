"use client"

// import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/context/components/ui/select"
import { Label } from "@/context/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/context/components/ui/card"
import { Switch } from "@/context/components/ui/switch"

export function GeneralSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>一般</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-base">外観</Label>
            <p className="text-sm text-muted-foreground">デバイス上のPerplexityの見た目</p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="dark-mode" />
            <Label htmlFor="dark-mode">システム (ダーク)</Label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-base">言語</Label>
            <p className="text-sm text-muted-foreground">ユーザーインターフェイスの言語</p>
          </div>
          <Select defaultValue="ja">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="言語を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">Japanese (日本語)</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-base">オートサジェスト</Label>
            <p className="text-sm text-muted-foreground">
              クエリを入力しながらドロップダウンとタブ補完の提案を有効にする
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="auto-suggest" defaultChecked />
            <Label htmlFor="auto-suggest">オートサジェストを有効にする</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

