import { NextRequest, NextResponse } from "next/server";
import algoliasearch from 'algoliasearch/lite';
import { Theme } from '@/stores/Theme';
import { Interviews } from "@/stores/Interviews";
import { collection, getDocs, query, where, doc as firebaseDoc, getDoc, Timestamp, DocumentReference, DocumentData, FieldValue } from "firebase/firestore";
import { db } from "../../../../firebase";

// Algolia検索クライアントの初期化
const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string;
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY as string;
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME as string;

interface InterviewNav {
    interview: Omit<Interviews, 'createdAt'> & { createdAt: string };
    theme: Omit<Theme, 'createdAt' | 'deadline'> & { createdAt: string, deadline: string };
    organizationName: string;
    href: string;
    isActive: boolean;
}

const searchClient = algoliasearch(appId, apiKey);

const formatTimestamp = (timestamp: Timestamp | FieldValue) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString('ja-JP');
    }
    return '日付不明';
};

export async function POST(req: NextRequest) {
    let interviewRefs: {[key: string]: string} = {};
    try {
      const { userId, initialQuery } = await req.json();
  
      if (!userId || !initialQuery) {
        return NextResponse.json({ error: '検索クエリが提供されていません' }, { status: 400 });
      }
  
      // Algoliaで検索を実行
      const index = searchClient.initIndex(indexName);
      const { hits } = await index.search<Theme>(initialQuery);
  
      const interviewPromises: Promise<InterviewNav[]>[] = hits.map(async (hit) => {
        const themeId = hit.themeId;
        
        // テーマドキュメントを取得
        const answerThemeDocRef = firebaseDoc(db, 'themes', themeId);
        const answerThemeDoc = await getDoc(answerThemeDocRef);
        if (!answerThemeDoc.exists()) {
          console.log(`テーマドキュメント ${themeId} が存在しません`);
          return [];
        }
        const answerTheme = answerThemeDoc.data() as Theme;

        const interviewsRef = collection(db, "themes", themeId, "interviews");
        const q = query(interviewsRef, where("intervieweeId", "==", userId));

        const interviewDocs = await getDocs(q);

        const interviewNavPromises = interviewDocs.docs.map(async (doc) => {
          const interviewData = doc.data() as Interviews;

          const answerInterviewDocRef = firebaseDoc(db, 'users', userId, 'answerInterviews', interviewData.answerInterviewId);
          const answerInterviewDoc = await getDoc(answerInterviewDocRef);
        
          if (answerInterviewDoc.exists()) {
            const data = answerInterviewDoc.data();
            const interviewRef = data.interviewReference as DocumentReference;
            interviewRefs[doc.id] = interviewRef.path;
          } else {
            console.log('指定されたドキュメントが存在しません');
            return null;
          }
  
          let organizationName = "";
          const clientDocRef = firebaseDoc(db, "clients", answerTheme.clientId);
          if (clientDocRef) {
            const clientDoc = await getDoc(clientDocRef);
            if (clientDoc.exists()) {
              organizationName = clientDoc.data().organizationName;
            }
          }

          return {
            interview: {
              interviewId: doc.id,
              intervieweeId: interviewData.intervieweeId,
              answerInterviewId: interviewData.answerInterviewId,
              manageThemeId: interviewData.manageThemeId,
              createdAt: interviewData.createdAt instanceof Timestamp ? interviewData.createdAt.toDate().toISOString() : new Date().toISOString(),
              questionCount: interviewData.questionCount,
              themeId: interviewData.themeId,
              reportCreated: interviewData.reportCreated,
              interviewDurationMin: interviewData.interviewDurationMin,
            },
            theme: {
              themeId: themeId,
              theme: answerTheme.theme,
              createUserId: answerTheme.createUserId,
              createdAt: answerTheme.createdAt instanceof Timestamp ? answerTheme.createdAt.toDate().toISOString() : new Date().toISOString(),
              deadline: answerTheme.deadline instanceof Timestamp ? answerTheme.deadline.toDate().toISOString() : new Date().toISOString(),
              clientId: answerTheme.clientId,
              interviewsRequestedCount: answerTheme.interviewsRequestedCount,
              collectInterviewsCount: answerTheme.collectInterviewsCount,
              interviewDurationMin: answerTheme.interviewDurationMin,
              isPublic: answerTheme.isPublic,
            },
            organizationName: organizationName,
            href: `/auto-interview/${userId}/${themeId}/${doc.id}/description`,
            isActive: false,
          } as InterviewNav;
        });
  
        return (await Promise.all(interviewNavPromises)).filter((interview): interview is InterviewNav => interview !== null);
      });
  
      const interviewResults = await Promise.all(interviewPromises);
      const validInterviews = interviewResults.flat();

      if (validInterviews.length > 0) {
        console.log("インタビューの作成日: " + validInterviews[0].interview.createdAt);
        console.log("テーマの作成日: " + validInterviews[0].theme.createdAt);
        console.log("テーマの締切日: " + validInterviews[0].theme.deadline);
      } else {
        console.log("有効なインタビューが見つかりませんでした");
      }
  
      return NextResponse.json({ interviewNav: validInterviews, interviewRefs: interviewRefs });
    } catch (error) {
      console.error('Error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}