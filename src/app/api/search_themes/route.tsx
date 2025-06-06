import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

interface RequestBody {
  initialQuery: string;
  userId: string | null;
}

interface InterviewNav {
  interview: any;
  theme: any;
  organizationName: string;
  href: string;
  isActive: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { initialQuery, userId }: RequestBody = await req.json();

    if (!userId || !initialQuery) {
      return NextResponse.json({ error: '検索クエリが提供されていません' }, { status: 400 });
    }

    // Firestoreで「テーマ名」に前方一致するテーマを検索
    const themesSnapshot = await adminDb.collection('themes')
      .where('theme', '>=', initialQuery)
      .where('theme', '<=', initialQuery + '\uf8ff')
      .get();

    const interviewRefs: { [key: string]: string } = {};
    const interviewNavs: InterviewNav[] = [];

    for (const themeDoc of themesSnapshot.docs) {
      const themeData = themeDoc.data();
      const themeId = themeDoc.id;

      // テーマに紐づくインタビューを取得
      const interviewsSnapshot = await adminDb.collection(`themes/${themeId}/interviews`)
        .where('intervieweeId', '==', userId)
        .get();

      for (const interviewDoc of interviewsSnapshot.docs) {
        const interviewData = interviewDoc.data();

        // 回答インタビューの参照を取得
        const answerInterviewDoc = await adminDb.doc(`users/${userId}/answerInterviews/${interviewData.answerInterviewId}`).get();
        if (!answerInterviewDoc.exists) {
          continue;
        }
        const answerInterviewData = answerInterviewDoc.data();
        interviewRefs[interviewDoc.id] = answerInterviewData?.interviewReference.path || '';

        // クライアント組織名を取得
        let organizationName = '';
        const clientDoc = await adminDb.doc(`clients/${themeData.clientId}`).get();
        if (clientDoc.exists) {
          organizationName = clientDoc.data()?.organizationName || '';
        }

        // タイムスタンプをISO文字列に変換する関数
        const formatTimestamp = (timestamp: Timestamp | FieldValue): string => {
          if (timestamp instanceof Timestamp) {
            return timestamp.toDate().toISOString();
          }
          return new Date().toISOString();
        };

        interviewNavs.push({
          interview: {
            interviewId: interviewDoc.id,
            intervieweeId: interviewData.intervieweeId,
            answerInterviewId: interviewData.answerInterviewId,
            createdAt: formatTimestamp(interviewData.createdAt),
            questionCount: interviewData.questionCount,
            themeId: interviewData.themeId,
            reportCreated: interviewData.reportCreated,
            interviewCollected: interviewData.interviewCollected,
            interviewDurationMin: interviewData.interviewDurationMin,
            temporaryId: interviewData.temporaryId,
            confirmedUserId: interviewData.confirmedUserId,
          },
          theme: {
            themeId: themeId,
            theme: themeData.theme,
            createUserId: themeData.createUserId,
            createdAt: formatTimestamp(themeData.createdAt),
            deadline: formatTimestamp(themeData.deadline),
            clientId: themeData.clientId,
            interviewsRequestedCount: themeData.interviewsRequestedCount,
            collectInterviewsCount: themeData.collectInterviewsCount,
            interviewDurationMin: themeData.interviewDurationMin,
            isPublic: themeData.isPublic,
            maximumNumberOfInterviews: themeData.maximumNumberOfInterviews,
            interviewResponseURL: themeData.interviewResponseURL,
            reportCreated: themeData.reportCreated,
          },
          organizationName: organizationName,
          href: `/auto-interview/${userId}/${themeId}/${interviewDoc.id}/description`,
          isActive: false,
        });
      }
    }

    return NextResponse.json({ interviewNav: interviewNavs, interviewRefs: interviewRefs });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}





// import { NextRequest, NextResponse } from "next/server";
// import algoliasearch from 'algoliasearch/lite';
// import { Theme } from '@/stores/Theme';
// import { Interviews } from "@/stores/Interviews";
// import { adminDb } from "../../../lib/firebase-admin";
// import { FieldValue, Timestamp } from "firebase-admin/firestore";

// // Algolia検索クライアントの初期化
// const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string;
// const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY as string;
// const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME as string;

// interface RequestBody {
//   initialQuery: string;
//   userId: string | null;
// }

// interface InterviewNav {
//     interview: Omit<Interviews, 'createdAt'> & { createdAt: string };
//     theme: Omit<Theme, 'createdAt' | 'deadline'> & { createdAt: string, deadline: string };
//     organizationName: string;
//     href: string;
//     isActive: boolean;
// }

// const searchClient = algoliasearch(appId, apiKey);

// export async function POST(req: NextRequest) {
//     let interviewRefs: {[key: string]: string} = {};
//     try {
//       const { initialQuery, userId }: RequestBody = await req.json();
  
//       if (!userId || !initialQuery) {
//         return NextResponse.json({ error: '検索クエリが提供されていません' }, { status: 400 });
//       }
  
//       // Algoliaで検索を実行
//       const index = searchClient.initIndex(indexName);
//       const { hits } = await index.search<Theme>(initialQuery);
  
//       const interviewPromises: Promise<InterviewNav[]>[] = hits.map(async (hit) => {
//         const themeId = hit.themeId;
        
//         // テーマドキュメントを取得
//         const answerThemeDocRef = adminDb.doc(`themes/${themeId}`);
//         const answerThemeDoc = await answerThemeDocRef.get();
//         if (!answerThemeDoc.exists) {
//           console.log(`テーマドキュメント ${themeId} が存在しません`);
//           return [];
//         }
//         const answerTheme = answerThemeDoc.data() as Theme;

//         const interviewsRef = adminDb.collection(`themes/${themeId}/interviews`);
//         const interviewDocs = await interviewsRef.where("intervieweeId", "==", userId).get();

//         const interviewNavPromises = interviewDocs.docs.map(async (doc) => {
//           const interviewData = doc.data() as Interviews;

//           const answerInterviewDocRef = adminDb.doc(`users/${userId}/answerInterviews/${interviewData.answerInterviewId}`);
//           const answerInterviewDoc = await answerInterviewDocRef.get();
        
//           if (answerInterviewDoc.exists) {
//             const data = answerInterviewDoc.data();
//             interviewRefs[doc.id] = data?.interviewReference.path;
//           } else {
//             console.log('指定されたドキュメントが存在しません');
//             return null;
//           }
  
//           let organizationName = "";
//           const clientDocRef = adminDb.doc(`clients/${answerTheme.clientId}`);
//           if (clientDocRef) {
//             const clientDoc = await clientDocRef.get();
//             if (clientDoc.exists) {
//               organizationName = clientDoc.data()?.organizationName;
//             }
//           }

//           const formatTimestamp = (timestamp: Timestamp | FieldValue): string => {
//             if (timestamp instanceof Timestamp) {
//                 return timestamp.toDate().toISOString();
//             }
//             return new Date().toISOString(); // FieldValueの場合は現在の日時を使用
//           };

//           return {
//             interview: {
//               interviewId: doc.id,
//               intervieweeId: interviewData.intervieweeId,
//               answerInterviewId: interviewData.answerInterviewId,
//               createdAt: formatTimestamp(interviewData.createdAt),
//               questionCount: interviewData.questionCount,
//               themeId: interviewData.themeId,
//               reportCreated: interviewData.reportCreated,
//               interviewCollected: interviewData.interviewCollected,
//               interviewDurationMin: interviewData.interviewDurationMin,
//               temporaryId: interviewData.temporaryId,
//               confirmedUserId: interviewData.confirmedUserId,
//             },
//             theme: {
//               themeId: themeId,
//               theme: answerTheme.theme,
//               createUserId: answerTheme.createUserId,
//               createdAt: formatTimestamp(answerTheme.createdAt),
//               deadline: formatTimestamp(answerTheme.deadline),
//               clientId: answerTheme.clientId,
//               interviewsRequestedCount: answerTheme.interviewsRequestedCount,
//               collectInterviewsCount: answerTheme.collectInterviewsCount,
//               interviewDurationMin: answerTheme.interviewDurationMin,
//               isPublic: answerTheme.isPublic,
//               maximumNumberOfInterviews: answerTheme.maximumNumberOfInterviews,
//               interviewResponseURL: answerTheme.interviewResponseURL,
//               reportCreated: answerTheme.reportCreated,
//             },
//             organizationName: organizationName,
//             href: `/auto-interview/${userId}/${themeId}/${doc.id}/description`,
//             isActive: false,
//           } as InterviewNav;
//         });
  
//         return (await Promise.all(interviewNavPromises)).filter((interview): interview is InterviewNav => interview !== null);
//       });
  
//       const interviewResults = await Promise.all(interviewPromises);
//       const validInterviews = interviewResults.flat();

//       if (validInterviews.length > 0) {
//         console.log("インタビューの作成日: " + validInterviews[0].interview.createdAt);
//         console.log("テーマの作成日: " + validInterviews[0].theme.createdAt);
//         console.log("テーマの締切日: " + validInterviews[0].theme.deadline);
//       } else {
//         console.log("有効なインタビューが見つかりませんでした");
//       }
  
//       return NextResponse.json({ interviewNav: validInterviews, interviewRefs: interviewRefs });
//     } catch (error) {
//       console.error('Error:', error);
//       return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//     }
// }