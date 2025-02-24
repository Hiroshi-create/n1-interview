'use client';

import { Button } from '@/context/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/context/components/ui/card';
import { Input } from '@/context/components/ui/input';
import { Label } from '@/context/components/ui/label';
import { Textarea } from '@/context/components/ui/textarea';
import { Play, Puzzle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ClusterResult } from '@/context/interface/ClusterResult';
import { useAppsContext } from '@/context/AppContext';

// ダイナミックインポートでGraphを描画
const Graph = dynamic(() => import('@/components/Graph'), { ssr: false });

interface ClusterFormProps {
  clusteringData: ClusterResult | null;
}

export default function ClusterForm({ clusteringData: initialClusteringData }: ClusterFormProps) {
  const { userId, selectedThemeId } = useAppsContext();
  const [nodes, setNodes] = useState<string>('');
  const [preference, setPreference] = useState<number>(-420);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [clusteringData, setClusteringData] = useState<ClusterResult | null>(initialClusteringData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/cluster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: nodes.split(',').map(node => node.trim()),
          preference: preference,
          themeId: selectedThemeId,
          userId: userId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('エラー:', errorData);
        return;
      }
      const data: ClusterResult = await response.json();
      setClusteringData(data);
    } catch (error) {
      console.error('エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-full gap-8">
      {/* フォームカード */}
      <Card className="w-full max-w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            クラスタリングフォーム
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nodes">ノード（カンマ区切り）:</Label>
              <Textarea
                id="nodes"
                value={nodes}
                onChange={(e) => setNodes(e.target.value)}
                placeholder="ノードをカンマ区切りで入力してください"
                className="min-h-[200px] max-h-[400px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preference">Preference:</Label>
              <Input
                id="preference"
                type="number"
                value={preference}
                onChange={(e) => setPreference(Number(e.target.value))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'クラスタリング中...' : 'クラスタリング実行'}
            </Button>
          </form>
          
          {isLoading && (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="mt-2">クラスタリング結果を計算中...</p>
            </div>
          )}
          
          {!isLoading && clusteringData && (
            <div className="space-y-2">
              <Label className="text-base">結果:</Label>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
                {JSON.stringify(clusteringData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* グラフカード */}
      {!isLoading && clusteringData && (
        <Card className="w-full max-w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="h-5 w-5" />
              クラスタリンググラフ
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[700px] w-full px-0 py-0 bg-gray-100">
            <Graph data={clusteringData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}





// {
//   "results": [
//     {
//       "category": "地理的特性が詳細",
//       "nodes": "三宮駅前 三宮駅周辺 JR三ノ宮駅の北側 北野異人館街 生田神社 さんちか（三宮地下街）"
//     },
//     {
//       "category": "観光地が神戸",
//       "nodes": "神戸どうぶつ王国 旧居留地・神戸市立博物館 ミント神戸 神戸ハーバーランド 湊川神社"
//     },
//     {
//       "category": "観光地が素敵",
//       "nodes": "メリケンパーク"
//     },
//     {
//       "category": "観光地が魅力的",
//       "nodes": "南京町"
//     },
//     {
//       "category": "観光地が楽しい",
//       "nodes": "東遊園地"
//     },
//     {
//       "category": "展望が素晴らしい",
//       "nodes": "神戸市役所24階展望ロビー 明石海峡大橋ブリッジワールド"
//     },
//     {
//       "category": "アトアが未知の単語",
//       "nodes": "アトア（átoa）"
//     },
//     {
//       "category": "アートが美しい",
//       "nodes": "AQUARIUM×ART atoa"
//     },
//     {
//       "category": "料理が本格的",
//       "nodes": "ダパイダン105（台湾料理）"
//     },
//     {
//       "category": "料理が美味しい",
//       "nodes": "ごはんや一芯（創作和食）"
//     }
//   ]
// }