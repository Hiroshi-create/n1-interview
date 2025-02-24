"use client";

import { Button } from '@/context/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import CostLineChart from './graph/costLineChart';
import CostPieChart from './graph/costPieChart';
import { useAppsContext } from '@/context/AppContext';
import { Theme } from '@/stores/Theme';
import { collection, doc, DocumentReference, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isValidThemeData } from '@/context/components/isValidDataCheck';

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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="flex flex-col h-full text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold">使用法: コスト</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">2月</span>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="default">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-4 gap-6 p-8">
        <div className="col-span-3 h-[500px]">
          <ChartContainer title="年間支出" containerSize={containerSize}>
            <CostLineChart data={yearlyDataByThemes} />
          </ChartContainer>
        </div>
        <div className="col-span-1 h-[250px]">
          <ChartContainer title="プロジェクトの月額請求" containerSize={containerSize}>
            <div className="flex flex-row items-center justify-evenly h-full">
              <div className='flex items-center justify-center h-full'>
                <CostPieChart data={costData} windowSize={containerSize}/>
              </div>
              <div className="text-center mr-4">
                <div className="text-xl font-bold">{costData.current}ドル</div>
                <div className="text-sm text-muted-foreground">/ {costData.limit}ドルの制限</div>
              </div>
            </div>
          </ChartContainer>
        </div>
        {/* この下でテーマの数ぶんグラフを表示 */}
        <div className="col-span-4 grid grid-cols-2 gap-6">
          {themes.map((theme, index) => (
            <div key={index} className="h-[500px]">
            <ChartContainer title={theme.theme} containerSize={containerSize}>
              <CostLineChart data={[dataByThemes[index]]} />
            </ChartContainer>
          </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardContent;
