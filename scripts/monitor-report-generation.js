#!/usr/bin/env node

/**
 * レポート生成を監視するスクリプト
 * Firestoreのデータを定期的にチェックして、レポート生成状況を表示
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const themeId = 'df7e6291-3d33-406e-8335-1742be5ed586';
const interviewId = '01adc61b-b4fb-4bab-8446-5c2a6250f4d0';

async function checkReportStatus() {
  try {
    // Firestoreの状態を確認するAPIを呼び出し
    const response = await fetch(`${baseUrl}/api/demo/check-report-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      throw new Error('Status check failed');
    }
  } catch (error) {
    console.error('❌ ステータス確認エラー:', error.message);
    return null;
  }
}

async function monitorReportGeneration() {
  console.log('🔍 レポート生成の監視を開始します...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 テーマID: ${themeId}`);
  console.log(`📝 インタビューID: ${interviewId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let checkCount = 0;
  const maxChecks = 30; // 最大30回チェック（5分間）
  let reportGenerated = false;

  console.log('⏱️  10秒ごとにステータスをチェックします（最大5分間）\n');

  const interval = setInterval(async () => {
    checkCount++;
    
    console.log(`[${new Date().toLocaleTimeString()}] チェック ${checkCount}/${maxChecks}`);
    
    const status = await checkReportStatus();
    
    if (status) {
      console.log(`  📊 インタビュー完了: ${status.interviewCollected ? '✅' : '❌'}`);
      console.log(`  📄 レポート生成済み: ${status.reportCreated ? '✅' : '❌'}`);
      
      if (status.reportId) {
        console.log(`  🆔 レポートID: ${status.reportId}`);
      }
      
      if (status.reportCreated && !reportGenerated) {
        reportGenerated = true;
        console.log('\n🎉 レポートが生成されました！');
        console.log(`  📍 パス: themes/${themeId}/interviews/${interviewId}/individualReport/${status.reportId}`);
        
        if (status.reportSummary) {
          console.log('\n📋 レポート概要:');
          console.log(status.reportSummary);
        }
        
        clearInterval(interval);
        console.log('\n✅ 監視を終了します');
        process.exit(0);
      }
    }
    
    if (checkCount >= maxChecks) {
      console.log('\n⏰ タイムアウト: 5分経過してもレポートが生成されませんでした');
      console.log('💡 ヒント: 以下を確認してください:');
      console.log('  1. OpenAI APIキーが正しく設定されているか');
      console.log('  2. Cronジョブが動作しているか');
      console.log('  3. 手動でレポート生成APIを呼び出してみる');
      clearInterval(interval);
      process.exit(1);
    }
  }, 10000); // 10秒ごとにチェック

  // 初回チェック
  console.log(`[${new Date().toLocaleTimeString()}] 初回チェック`);
  const initialStatus = await checkReportStatus();
  if (initialStatus) {
    console.log(`  📊 インタビュー完了: ${initialStatus.interviewCollected ? '✅' : '❌'}`);
    console.log(`  📄 レポート生成済み: ${initialStatus.reportCreated ? '✅' : '❌'}`);
    
    if (initialStatus.reportCreated) {
      console.log('\n✅ レポートは既に生成されています！');
      console.log(`  🆔 レポートID: ${initialStatus.reportId}`);
      clearInterval(interval);
      process.exit(0);
    }
  }

  // Cronジョブ手動実行のヒント
  console.log('\n💡 手動でCronジョブを実行する場合:');
  console.log(`curl ${baseUrl}/api/cron/generate-missing-reports?limit=1\n`);
}

// スクリプト実行
monitorReportGeneration().catch(console.error);