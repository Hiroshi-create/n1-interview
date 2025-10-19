import { FieldValue, Timestamp } from "firebase/firestore";

// リップシンクデータの型定義
export interface LipSync {
    mouthCues: Array<{ 
        start: number; 
        end: number; 
        value: string; 
        intensity: number; 
    }>;
    blinkCues: Array<{ 
        time: number; 
        duration: number; 
    }>;
    emotionCues: Array<{ 
        start: number; 
        end: number; 
        emotion: string; 
        intensity: number; 
    }>;
}

export type Message = {
    messageId: string;
    text: string;
    sender: string;
    createdAt: Timestamp | FieldValue;
    type: string;
    // 3Dアバター用の追加プロパティ
    audio?: string;  // Base64エンコードされた音声データ
    lipsync?: LipSync;  // リップシンクデータ
    facialExpression?: string;  // 表情
    animation?: string;  // アニメーション名
}