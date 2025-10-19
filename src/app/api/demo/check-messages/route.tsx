import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const themeId = 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b';
    const themeRef = adminDb.doc(`themes/${themeId}`);
    const interviewsRef = themeRef.collection('interviews');
    
    // 最初のインタビューを取得
    const snapshot = await interviewsRef.limit(1).get();
    
    if (snapshot.empty) {
      return NextResponse.json({ error: 'No interviews found' }, { status: 404 });
    }
    
    const interviewDoc = snapshot.docs[0];
    const interviewData = interviewDoc.data();
    
    // メッセージを取得
    const messagesRef = interviewDoc.ref.collection('messages');
    const messagesSnapshot = await messagesRef.limit(3).get();
    
    const messages: any[] = [];
    messagesSnapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        fields: Object.keys(data),
        data: {
          messageId: data.messageId || 'なし',
          sender: data.sender || 'なし',
          text: data.text ? data.text.substring(0, 50) + '...' : 'なし',
          type: data.type || 'なし',
          createdAt: data.createdAt ? '存在' : 'なし',
          timestamp: data.timestamp ? '存在' : 'なし',
          isUser: data.isUser !== undefined ? data.isUser : 'なし',
        }
      });
    });
    
    // メッセージをtimestampで取得も試す
    const messagesWithTimestamp = await messagesRef.orderBy('timestamp', 'asc').limit(3).get();
    const timestampMessages: any[] = [];
    messagesWithTimestamp.forEach(doc => {
      timestampMessages.push({
        id: doc.id,
        hasTimestamp: true
      });
    });
    
    // メッセージをcreatedAtで取得も試す
    let createdAtMessages: any[] = [];
    try {
      const messagesWithCreatedAt = await messagesRef.orderBy('createdAt', 'asc').limit(3).get();
      messagesWithCreatedAt.forEach(doc => {
        createdAtMessages.push({
          id: doc.id,
          hasCreatedAt: true
        });
      });
    } catch (e) {
      createdAtMessages = [`エラー: ${(e as Error).message}`];
    }
    
    return NextResponse.json({
      interviewId: interviewDoc.id,
      interviewPath: `themes/${themeId}/interviews/${interviewDoc.id}`,
      messageCount: messagesSnapshot.size,
      messages,
      timestampTest: {
        count: timestampMessages.length,
        messages: timestampMessages
      },
      createdAtTest: {
        count: createdAtMessages.length,
        messages: createdAtMessages
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error checking messages',
      details: (error as Error).message 
    }, { status: 500 });
  }
}