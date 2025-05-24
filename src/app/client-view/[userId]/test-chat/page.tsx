"use client";

import { useEffect, useState } from 'react';
import { useAppsContext } from '@/context/AppContext';
import { Theme } from '@/stores/Theme';
import { collection, doc, DocumentReference, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isValidThemeData } from '@/context/components/isValidDataCheck';
import { Client } from '@/stores/Client';
import { useLastVisitedUrl } from '@/context/hooks/useLastVisitedUrl';
import TestChat from './contents/testChat';

// 料金
const costData = {
  current: 2.42,
  limit: 120.0,
}

interface DataByTopic {
  id: string;
  color: string;
  data: {
      x: string;
      y: number;
  }[];
}[]

interface ChartContainerProps {
  title: string
  children: React.ReactNode
  containerSize: { width: number; height: number }
}

const ChartContainer = ({ title, children, containerSize }: ChartContainerProps) => (
  <div className="h-full bg-background rounded-lg border border-border p-4 flex flex-col">
    <h2 className="text-lg font-medium text-foreground mb-4">{title}</h2>
    <div className="flex-grow overflow-hidden">{children}</div>
  </div>
)

const DashboardContent = () => {
  const {
      user,
      userId,
  } = useAppsContext();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [dataByThemes, setDataByThemes] = useState<DataByTopic[]>([]);
  const [yearlyDataByThemes, setYearlyDataByThemes] = useState<DataByTopic[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("inactive");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useLastVisitedUrl();

  useEffect(() => {
    if (user && userId) {
        const fetchUserDataAndThemes = async () => {
            setIsLoading(true);
            try {
                // ユーザードキュメントの参照を取得
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    if (userData.inOrganization) {
                        const organizationId = userData.organizationId;
                        if (organizationId) {
                            const clientDocRef = doc(db, "clients", organizationId);
                            const clientDocSnap = await getDoc(clientDocRef);
                            if (clientDocSnap.exists()) {
                                const clientData = clientDocSnap.data() as Client;
                                const subscriptionStatus = clientData.subscriptionStatus;
                                setSubscriptionStatus(subscriptionStatus);
                            }
                            const themeCollectionRef = collection(db, "clients", organizationId, "manageThemes");
                            const q = query(themeCollectionRef, orderBy("createdAt", "desc"));
                            
                            const unsubscribe = onSnapshot(q, async (snapshot) => {
                                const themePromises = snapshot.docs.map(async (doc) => {
                                    const themeRef = doc.data().themeReference as DocumentReference;
                                    if (themeRef) {
                                        const themeDoc = await getDoc(themeRef);
                                        if (themeDoc.exists()) {
                                            const data = themeDoc.data();
                                            if (isValidThemeData(data)) {
                                                return {
                                                    themeId: data.themeId,
                                                    theme: data.theme,
                                                    createUserId: data.createUserId,
                                                    createdAt: data.createdAt,
                                                    deadline: data.deadline,
                                                    clientId: data.clientId,
                                                    interviewsRequestedCount: data.interviewsRequestedCount,
                                                    collectInterviewsCount: data.collectInterviewsCount,
                                                    interviewDurationMin: data.interviewDurationMin,
                                                    isPublic: data.isPublic,
                                                    maximumNumberOfInterviews: data.maximumNumberOfInterviews,
                                                    interviewResponseURL: data.interviewResponseURL,
                                                    reportCreated: data.reportCreated,
                                                } as Theme;
                                            }
                                        }
                                    }
                                    return null;
                                });

                                const themeResults = await Promise.all(themePromises);
                                const validThemes = themeResults.filter((theme): theme is Theme => theme !== null);
                                setThemes(validThemes);

                                const dataByThemes = validThemes.map(theme => {
                                  const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
                                  const data = [];
                                
                                  // ランダムな開始月を選択（0-11）
                                  const startMonthIndex = Math.floor(Math.random() * 12);
                                  
                                  // 開始月から12月までの月数を計算
                                  const remainingMonths = 12 - startMonthIndex;
                                  
                                  // ランダムな連続月数を選択（1から残りの月数まで）
                                  const numberOfMonths = Math.floor(Math.random() * remainingMonths) + 1;
                                
                                  for (let i = 0; i < numberOfMonths; i++) {
                                    const monthIndex = startMonthIndex + i;
                                    data.push({
                                      x: months[monthIndex],
                                      y: Math.floor(Math.random() * 300)
                                    });
                                  }
                                
                                  return {
                                    id: theme.theme,
                                    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
                                    data: data
                                  };
                                });

                                // 年間支出用のデータを生成
                                const yearlyDataByThemes = validThemes.map(theme => {
                                  const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
                                  
                                  // dataByThemesから対応するテーマのデータを取得
                                  const themeData = dataByThemes.find(item => item.id === theme.theme);
                                  
                                  const data = months.map(month => {
                                    // 対応する月のデータを探す
                                    const monthData = themeData ? themeData.data.find(d => d.x === month) : null;
                                    
                                    // データがある場合はその値を、ない場合は0を返す
                                    return {
                                      x: month,
                                      y: monthData ? monthData.y : 0
                                    };
                                  });

                                  // 年間合計を計算
                                  const yearlyTotal = data.reduce((sum, item) => sum + item.y, 0);

                                  return {
                                    id: theme.theme,
                                    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
                                    data: data,
                                    yearlyTotal: yearlyTotal // 年間合計を追加
                                  };
                                });


                                setYearlyDataByThemes(yearlyDataByThemes);

                                setDataByThemes(dataByThemes);
                                setIsLoading(false);
                            });

                            return () => unsubscribe();
                        } else {
                            console.error("ユーザーに organizationId が設定されていません");
                        }
                    } else {
                        console.log("ユーザーは組織に属していません");
                    }
                } else {
                    console.error("ユーザードキュメントが存在しません");
                }
            } catch (error) {
                console.error("ユーザーデータとテーマの取得中にエラーが発生しました:", error);
                setIsLoading(false);
            }
        };

        fetchUserDataAndThemes();
    }
  }, [user, userId, db]);

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  return (
    <div className='flex flex-row h-full'>
      <div className={`w-full border bg-white bg-gray-100 shadow-md rounded-lg mb-12 transition-all duration-300`}>
        <TestChat />
      </div>
    </div>
  );
}

export default DashboardContent;
