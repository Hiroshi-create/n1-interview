#!/usr/bin/env node

/**
 * メッセージ検証スクリプト
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function checkMessages() {
  console.log('📊 メッセージフィールド検証\n');
  
  // 最初のインタビューを取得
  const response = await fetch(`${baseUrl}/api/demo/ai-interviews`);
  const data = await response.json();
  
  if (data.interviews && data.interviews.length > 0) {
    const firstInterview = data.interviews[0];
    const interviewId = firstInterview.id || firstInterview.interviewId;
    
    console.log(`インタビューID: ${interviewId}`);
    console.log(`パス: themes/d3e5f07c-b018-4de3-928b-a4fd8810ca4b/interviews/${interviewId}/messages\n`);
    
    // メッセージデータ検証用のAPIを呼び出す（新規作成が必要）
    console.log('⚠️ Firestoreに直接アクセスしてメッセージフィールドを確認する必要があります。');
    console.log('\n必須フィールド:');
    console.log('- createdAt (Timestamp)');
    console.log('- messageId (string)');
    console.log('- sender ("bot" | "user")');
    console.log('- text (string)');
    console.log('- type ("interview")');
  }
}

checkMessages().catch(console.error);