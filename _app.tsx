import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'

// グローバルスタイルのインポート（必要に応じて）
import '../styles/globals.css'

// Highchartsの動的インポート
const HighchartsWrapper = dynamic(
  () => import('./src/components/highchartsWrapper'),
  { ssr: false }
)

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // クライアントサイドでのみ実行されるコード
    if (typeof window !== 'undefined') {
      import('highcharts').then(Highcharts => {
        Highcharts.default.wrap(
          Highcharts.default.Chart.prototype,
          'setReflow',
          function (this: Highcharts.Chart, proceed: Function) {
            proceed.apply(this, Array.prototype.slice.call(arguments, 1));
            this.reflow();
          }
        );
      });
    }
  }, []);

  return (
    <>
      <HighchartsWrapper />
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
