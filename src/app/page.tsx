"use client"

import dynamic from 'next/dynamic'

// GraphCanvasコンポーネントを動的にインポートし、サーバーサイドレンダリング(SSR)を無効にする
const DynamicGraphCanvas = dynamic(
  () => import('reagraph').then(mod => mod.GraphCanvas),
  {
    ssr: false, // サーバーサイドレンダリングを無効にする
    loading: () => <p>Loading graph...</p> // ローディング中の表示
  }
)

export default function Home() {
  return (
    <div className="App">
      <DynamicGraphCanvas
        nodes={[
          {
            id: "n-1",
            label: "1"
          },
          {
            id: "n-2",
            label: "2"
          },
          {
            id: "n-3",
            label: "3"
          },
          {
            id: "n-4",
            label: "4"
          }
        ]}
        edges={[
          {
            id: "1->2",
            source: "n-1",
            target: "n-2",
            label: "Edge 1-2"
          },
          {
            id: "1->3",
            source: "n-1",
            target: "n-3",
            label: "Edge 1-3"
          },
          {
            id: "1->4",
            source: "n-1",
            target: "n-4",
            label: "Edge 1-4"
          }
        ]}
      />
    </div>
  );
}