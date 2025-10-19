/**
 * キャッシュ互換性レイヤー
 * memoryCache参照を新しいLRUキャッシュに安全に移行
 */

import { audioCache, lipSyncCache } from './lru-cache';
import { logger } from './logger';

/**
 * 互換性のためのメモリキャッシュインターフェース
 * 既存のコードとの後方互換性を保証
 */
export const memoryCache = {
  audioFiles: {
    get(key: string): Buffer | undefined {
      try {
        const result = audioCache.get(key);
        if (result) {
          logger.debug('Cache hit (audio)', { key });
        }
        return result;
      } catch (error) {
        logger.error('Audio cache get error', error as Error, { key });
        return undefined;
      }
    },
    
    set(key: string, value: Buffer): void {
      try {
        audioCache.set(key, value);
        logger.debug('Cache set (audio)', { key, size: value.length });
      } catch (error) {
        logger.error('Audio cache set error', error as Error, { key });
      }
    },
    
    has(key: string): boolean {
      return audioCache.get(key) !== undefined;
    },
    
    delete(key: string): boolean {
      return audioCache.delete(key);
    },
    
    clear(): void {
      audioCache.clear();
    }
  },
  
  lipSyncData: {
    get(key: string): any {
      try {
        const result = lipSyncCache.get(key);
        if (result) {
          logger.debug('Cache hit (lipsync)', { key });
        }
        return result;
      } catch (error) {
        logger.error('LipSync cache get error', error as Error, { key });
        return undefined;
      }
    },
    
    set(key: string, value: any): void {
      try {
        lipSyncCache.set(key, value);
        logger.debug('Cache set (lipsync)', { key });
      } catch (error) {
        logger.error('LipSync cache set error', error as Error, { key });
      }
    },
    
    has(key: string): boolean {
      return lipSyncCache.get(key) !== undefined;
    },
    
    delete(key: string): boolean {
      return lipSyncCache.delete(key);
    },
    
    clear(): void {
      lipSyncCache.clear();
    }
  }
};

/**
 * キャッシュ統計情報を取得
 */
export function getCacheStats() {
  return {
    audio: audioCache.getStats(),
    lipSync: lipSyncCache.getStats()
  };
}

/**
 * キャッシュのヘルスチェック
 */
export function checkCacheHealth(): {
  healthy: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // オーディオキャッシュのチェック
  const audioStats = audioCache.getStats();
  if (audioStats.evictions > 100) {
    issues.push(`High audio cache eviction rate: ${audioStats.evictions}`);
  }
  
  // リップシンクキャッシュのチェック
  const lipSyncStats = lipSyncCache.getStats();
  if (lipSyncStats.evictions > 200) {
    issues.push(`High lipsync cache eviction rate: ${lipSyncStats.evictions}`);
  }
  
  // ヒット率のチェック
  const audioHitRate = parseFloat(audioStats.hitRate);
  if (audioHitRate < 50) {
    issues.push(`Low audio cache hit rate: ${audioStats.hitRate}`);
  }
  
  return {
    healthy: issues.length === 0,
    issues
  };
}