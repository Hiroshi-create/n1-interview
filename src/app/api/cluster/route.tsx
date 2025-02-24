import { ClusterResult } from '@/context/interface/ClusterResult';
import { NextResponse } from 'next/server';
import { ClusteringData } from '@/stores/ClusteringData';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RequestBody {
  nodes: string[];
  preference: number;
  themeId: string;
  userId: string;
}

const saveClusterResult = async (themeId: string, userId: string, data: ClusterResult, nodes: string[], preference: number) => {
  const clusteringDataRef = adminDb.collection('themes').doc(themeId).collection('clusteringData').doc();
  const clusteringData: ClusteringData = {
    createdAt: FieldValue.serverTimestamp(),
    createUserId: userId,
    clusterResult: data,
    nodes: nodes,
    preference: preference,
  };
  await clusteringDataRef.set(clusteringData);
};

export async function POST(request: Request) {
  try {
    const { nodes, preference, themeId, userId }: RequestBody = await request.json();
    
    const response = await fetch('http://localhost:8000/cluster', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nodes, preference }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data: ClusterResult = await response.json();
    
    // Firestoreにデータを保存
    await saveClusterResult(themeId, userId, data, nodes, preference);

    return NextResponse.json(data);
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}