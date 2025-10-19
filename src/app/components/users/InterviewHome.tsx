"use client";

import { useAppsContext } from '@/context/AppContext';
import React, { useEffect, useState, useCallback } from 'react';
import { collection, DocumentReference, getDoc, doc as firestoreDoc, onSnapshot, orderBy, query, Timestamp, DocumentData, limit } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import { db } from '../../../lib/firebase';
import { isValidThemeData } from '@/context/components/isValidDataCheck';
import InterviewCard from '@/context/components/ui/interviewCard';
import { ThemeNav } from '@/context/interface/ThemeNav';
import { SearchBar } from '@/context/components/ui/searchBar';
import { FilterPanel, FilterOptions } from '@/context/components/ui/filterPanel';
import { LoadingCard } from '@/context/components/ui/loading';
import { useIsMobile } from '@/context/hooks/useIsMobile';
import { Search } from 'lucide-react';

const InterviewHome: React.FC = () => {
  const {
    user,
    userId,
    setSelectedThemeId,
    setSelectedThemeRef,
    setSelectThemeName,
  } = useAppsContext();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [themesNav, setThemesNav] = useState<ThemeNav[]>([]);
  const [themeRefs, setThemeRefs] = useState<{[key: string]: DocumentReference}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    isPublic: true
  });
  const [totalCount, setTotalCount] = useState(0);
  const isMobile = useIsMobile();

  // 初期データ読み込み関数
  const loadInitialData = useCallback(() => {
    if(!user || !userId) return;
    
    setIsLoading(true);
    const themeCollectionRef = collection(db, "themes");
    // シンプルなクエリで初期データを取得（インデックス不要）
    const q = query(
      themeCollectionRef, 
      orderBy("createdAt", "desc"),
      limit(100) // パフォーマンスのため最初は100件に制限
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const themePromises = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          // クライアント側でisPublicをフィルタリング（インデックス不要）
          return isValidThemeData(data) && data.isPublic === true;
        })
        .map(async (doc) => {
          const themeData = doc.data();
          let organizationName = "";
          
          try {
            const clientDocRef = firestoreDoc(db, "clients", themeData.clientId);
            const clientDoc = await getDoc(clientDocRef);
            if (clientDoc.exists()) {
              organizationName = clientDoc.data().organizationName || "";
            }
          } catch (error) {
            console.error(`Failed to fetch client data for ${themeData.clientId}:`, error);
          }

          return {
            theme: {
              themeId: doc.id,
              theme: themeData.theme,
              createUserId: themeData.createUserId,
              createdAt: themeData.createdAt, // Timestamp型を保持
              deadline: themeData.deadline, // Timestamp型を保持
              clientId: themeData.clientId,
              interviewsRequestedCount: themeData.interviewsRequestedCount || 0,
              collectInterviewsCount: themeData.collectInterviewsCount || 0,
              interviewDurationMin: themeData.interviewDurationMin || 30,
              isPublic: themeData.isPublic,
              maximumNumberOfInterviews: themeData.maximumNumberOfInterviews || 100,
              interviewResponseURL: themeData.interviewResponseURL || "",
              reportCreated: themeData.reportCreated || false,
            },
            organizationName: organizationName,
            href: `/auto-interview/${userId}/${doc.id}/description`,
            isActive: false,
          } as ThemeNav;
        });

      const themeResults = await Promise.all(themePromises);
      setThemesNav(themeResults);
      setTotalCount(themeResults.length);

      // テーマ参照のマップを構築
      const newThemeRefs: {[key: string]: DocumentReference} = {};
      snapshot.docs
        .filter(doc => {
          const data = doc.data();
          return isValidThemeData(data) && data.isPublic === true;
        })
        .forEach((doc) => {
          newThemeRefs[doc.id] = doc.ref;
        });
      setThemeRefs(newThemeRefs);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching themes:', error);
      setIsLoading(false);
      // エラーメッセージを表示
      toast.error('読み込みエラー', 'テーマの読み込みに失敗しました。ページを更新してください。');
    });

    return unsubscribe;
  }, [user, userId]);

  // 初期データ読み込み（公開テーマのみ）
  useEffect(() => {
    if(user && userId) {
      const unsubscribe = loadInitialData();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user, userId]);

  // 初期データ読み込み時は除く条件を削除
  useEffect(() => {
    if(user && userId) {
      // loadInitialData関数に移動済み
    }
  }, [user, userId]);

  const selectTheme = (themeNav: ThemeNav) => {
    // const interviewId = interviewNav.interview.interviewId;
    // console.log("ホームのinterviewId : " + interviewId)
    // setSelectedInterviewId(interviewId);
    // setSelectedInterviewRef(interviewRefs[interviewId]);
    // setSelectedThemeId(interviewNav.theme.themeId);
    // setSelectThemeName(interviewNav.theme.theme);

    const theme = themeNav.theme;
    setSelectedThemeRef(themeRefs[theme.themeId]);
    setSelectedThemeId(theme.themeId);
    setSelectThemeName(theme.theme);
  };


  // 新しい検索API呼び出し
  const performSearch = useCallback(async () => {
    if (!userId) return;
    
    setIsSearching(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/search_themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          filters: {
            ...filters,
            keyword: searchTerm,
            answered: filters.answered === 'answered' ? true : filters.answered === 'unanswered' ? false : undefined
          },
          userId: userId,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `サーバーエラー: ${response.status}`);
      }
  
      const data = await response.json();
  
      if (data.themes && Array.isArray(data.themes)) {
        // Timestamp型を復元
        const themesWithTimestamp = data.themes.map((themeNav: any) => {
          if (themeNav.theme) {
            // createdAtをTimestampに変換
            if (themeNav.theme.createdAt) {
              if (typeof themeNav.theme.createdAt === 'object' && themeNav.theme.createdAt._seconds) {
                themeNav.theme.createdAt = new Timestamp(
                  themeNav.theme.createdAt._seconds,
                  themeNav.theme.createdAt._nanoseconds || 0
                );
              }
            }
            // deadlineをTimestampに変換
            if (themeNav.theme.deadline) {
              if (typeof themeNav.theme.deadline === 'object' && themeNav.theme.deadline._seconds) {
                themeNav.theme.deadline = new Timestamp(
                  themeNav.theme.deadline._seconds,
                  themeNav.theme.deadline._nanoseconds || 0
                );
              }
            }
          }
          return themeNav;
        });
        
        setThemesNav(themesWithTimestamp);
        setTotalCount(data.totalCount || themesWithTimestamp.length);
        
        if (data.themeRefs && typeof data.themeRefs === 'object') {
          const convertedRefs: {[key: string]: DocumentReference<DocumentData, DocumentData>} = {};
          Object.entries(data.themeRefs).forEach(([key, path]) => {
            if (typeof path === 'string') {
              convertedRefs[key] = firestoreDoc(db, path) as DocumentReference<DocumentData, DocumentData>;
            }
          });
          setThemeRefs(convertedRefs);
        }
      } else {
        setThemesNav([]);
        setThemeRefs({});
        setTotalCount(0);
      }
    } catch (error) {
      console.error('検索エラー:', error);
      toast.error('検索エラー', '検索中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, filters, userId, user]);

  // 検索実行
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  // フィルター適用
  const handleApplyFilters = () => {
    performSearch();
  };

  // フィルターリセット
  const handleResetFilters = () => {
    // フィルターを初期状態に戻す
    setFilters({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      isPublic: true
    });
    // 検索キーワードもクリア
    setSearchTerm('');
    // 初期データを再取得
    loadInitialData();
  };

  // 検索条件が変更されたら検索実行
  useEffect(() => {
    if (!userId) return;
    
    // 検索キーワードがあるか、デフォルト以外のフィルターが適用されている場合のみ検索
    const hasSearchKeyword = searchTerm && searchTerm.trim().length > 0;
    const hasActiveFilters = Object.keys(filters).some(key => {
      if (key === 'sortBy' || key === 'sortOrder' || key === 'isPublic') return false;
      const value = filters[key as keyof FilterOptions];
      return value !== undefined && value !== 'all' && value !== '';
    });
    
    if (hasSearchKeyword || hasActiveFilters) {
      const timer = setTimeout(() => {
        performSearch();
      }, 500);
      return () => clearTimeout(timer);
    } else if (!hasSearchKeyword && !hasActiveFilters) {
      // 検索条件がクリアされた場合は初期データを表示
      loadInitialData();
    }
  }, [searchTerm, filters, userId, performSearch, loadInitialData]);

  return (
    <div className="w-full">
      {/* 検索バーとフィルターボタン */}
      <div className="bg-white border-b sticky top-0 z-[5] px-2 sm:px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onSearch={handleSearch}
            isLoading={isSearching}
            showHistory={true}
            showTrending={true}
            enableVoice={!isMobile}
            />
          </div>
          {isMobile && (
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
              showAsSheet={true}
            />
          )}
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="px-2 sm:px-4 pt-4 pb-8">
        <div className="flex gap-4">
          {/* サイドバーフィルター（デスクトップのみ） */}
          {!isMobile && (
            <div className="w-64 lg:w-72 xl:w-80 flex-shrink-0">
              <div className="sticky top-20">
                <FilterPanel
                  filters={filters}
                  onChange={setFilters}
                  onApply={handleApplyFilters}
                  onReset={handleResetFilters}
                />
              </div>
            </div>
          )}

          {/* 検索結果 */}
          <div className="flex-1 min-w-0">
              {/* 結果ヘッダー */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
              {isSearching ? (
                <span>検索中...</span>
              ) : (
                <span>
                  {totalCount}件のテーマ
                  {searchTerm && ` "${searchTerm}" の検索結果`}
                </span>
              )}
            </div>
          </div>

              {/* ローディング表示 */}
              {(isLoading || isSearching) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <LoadingCard key={i} lines={3} showAvatar={false} />
                  ))}
                </div>
          ) : themesNav.length === 0 ? (
            // 結果なし表示
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                テーマが見つかりませんでした
              </h3>
              <p className="text-sm text-gray-600">
                検索条件を変更してお試しください
              </p>
              </div>
            ) : (
              // 検索結果グリッド
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {themesNav.map((themeNav) => (
                  <InterviewCard 
                    key={themeNav.theme.themeId}
                    themeNav={themeNav}
                    onClick={() => {
                      selectTheme(themeNav);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewHome;