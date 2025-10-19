/**
 * LRU (Least Recently Used) キャッシュ実装
 * メモリ使用量を制限しながら効率的にデータをキャッシュ
 */

import { logger } from './logger';

interface CacheNode<K, V> {
  key: K;
  value: V;
  size: number;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
  timestamp: number;
}

interface CacheOptions {
  maxSize?: number;        // 最大サイズ（バイト）
  maxEntries?: number;      // 最大エントリ数
  ttl?: number;            // Time To Live (ミリ秒)
  onEvict?: <K, V>(key: K, value: V) => void;  // エビクション時のコールバック
  calculateSize?: <V>(value: V) => number;      // サイズ計算関数
}

/**
 * LRUキャッシュクラス
 * 最近使用されていないアイテムを自動的に削除
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheNode<K, V>> = new Map();
  private head: CacheNode<K, V> | null = null;
  private tail: CacheNode<K, V> | null = null;
  private currentSize: number = 0;
  private readonly maxSize: number;
  private readonly maxEntries: number;
  private readonly ttl: number;
  private readonly onEvict?: <K, V>(key: K, value: V) => void;
  private readonly calculateSize: <V>(value: V) => number;
  
  // 統計情報
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    sets: 0
  };

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 50 * 1024 * 1024; // デフォルト50MB
    this.maxEntries = options.maxEntries || 1000;
    this.ttl = options.ttl || 0; // 0の場合はTTLなし
    this.onEvict = options.onEvict;
    this.calculateSize = options.calculateSize || this.defaultCalculateSize;
    
    // 定期的なTTLクリーンアップ（TTLが設定されている場合）
    if (this.ttl > 0) {
      setInterval(() => this.cleanupExpired(), Math.min(this.ttl, 60000));
    }
  }

  /**
   * デフォルトのサイズ計算関数
   */
  private defaultCalculateSize<V>(value: V): number {
    if (value instanceof Buffer) {
      return value.length;
    }
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16として概算
    }
    if (typeof value === 'object' && value !== null) {
      // オブジェクトの場合はJSON文字列のサイズを概算
      try {
        return JSON.stringify(value).length * 2;
      } catch {
        return 1024; // エラー時はデフォルトサイズ
      }
    }
    return 8; // プリミティブ型のデフォルトサイズ
  }

  /**
   * キャッシュからアイテムを取得
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);
    
    if (!node) {
      this.stats.misses++;
      return undefined;
    }

    // TTLチェック
    if (this.ttl > 0 && Date.now() - node.timestamp > this.ttl) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // 最近使用されたアイテムを先頭に移動
    this.moveToHead(node);
    this.stats.hits++;
    return node.value;
  }

  /**
   * キャッシュにアイテムを設定
   */
  set(key: K, value: V): void {
    const size = this.calculateSize(value);
    
    // サイズが最大値を超える場合は設定しない
    if (size > this.maxSize) {
      logger.warn('LRUCache: Item too large to cache', { key: String(key), size });
      return;
    }

    // 既存のノードがある場合は更新
    if (this.cache.has(key)) {
      const node = this.cache.get(key)!;
      this.currentSize -= node.size;
      node.value = value;
      node.size = size;
      node.timestamp = Date.now();
      this.currentSize += size;
      this.moveToHead(node);
    } else {
      // 新しいノードを作成
      const newNode: CacheNode<K, V> = {
        key,
        value,
        size,
        prev: null,
        next: null,
        timestamp: Date.now()
      };

      this.cache.set(key, newNode);
      this.addToHead(newNode);
      this.currentSize += size;
      this.stats.sets++;

      // 容量制限チェック
      while (this.currentSize > this.maxSize || this.cache.size > this.maxEntries) {
        this.evictLRU();
      }
    }
  }

  /**
   * キャッシュからアイテムを削除
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.currentSize -= node.size;
    this.cache.delete(key);
    
    if (this.onEvict) {
      this.onEvict(key, node.value);
    }
    
    return true;
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    if (this.onEvict) {
      this.cache.forEach((node, key) => {
        this.onEvict!(key, node.value);
      });
    }
    
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.currentSize = 0;
    logger.info('LRUCache: Cache cleared');
  }

  /**
   * ノードを先頭に追加
   */
  private addToHead(node: CacheNode<K, V>): void {
    node.prev = null;
    node.next = this.head;
    
    if (this.head) {
      this.head.prev = node;
    }
    
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * ノードを削除
   */
  private removeNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * ノードを先頭に移動
   */
  private moveToHead(node: CacheNode<K, V>): void {
    if (node === this.head) {
      return;
    }
    
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * 最も使用されていないアイテムを削除
   */
  private evictLRU(): void {
    if (!this.tail) {
      return;
    }
    
    const lru = this.tail;
    this.removeNode(lru);
    this.currentSize -= lru.size;
    this.cache.delete(lru.key);
    this.stats.evictions++;
    
    if (this.onEvict) {
      this.onEvict(lru.key, lru.value);
    }
    
    logger.debug('LRUCache: Evicted item', { 
      key: String(lru.key), 
      size: lru.size,
      currentSize: this.currentSize 
    });
  }

  /**
   * 期限切れアイテムのクリーンアップ
   */
  private cleanupExpired(): void {
    if (this.ttl <= 0) {
      return;
    }
    
    const now = Date.now();
    const expiredKeys: K[] = [];
    
    this.cache.forEach((node, key) => {
      if (now - node.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.delete(key));
    
    if (expiredKeys.length > 0) {
      logger.debug('LRUCache: Cleaned up expired items', { count: expiredKeys.length });
    }
  }

  /**
   * キャッシュのサイズ情報を取得
   */
  size(): { entries: number; bytes: number } {
    return {
      entries: this.cache.size,
      bytes: this.currentSize
    };
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate.toFixed(2)}%`,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      entries: this.cache.size,
      maxEntries: this.maxEntries
    };
  }

  /**
   * 統計情報をリセット
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
  }
}

/**
 * グローバルキャッシュインスタンス
 */
export const audioCache = new LRUCache<string, Buffer>({
  maxSize: 100 * 1024 * 1024, // 100MB
  maxEntries: 500,
  ttl: 30 * 60 * 1000, // 30分
  onEvict: (key, value) => {
    logger.debug('Audio cache eviction', { key, size: value.length });
  }
});

export const lipSyncCache = new LRUCache<string, any>({
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  ttl: 30 * 60 * 1000, // 30分
});

export const phonemeCache = new LRUCache<string, string[]>({
  maxSize: 10 * 1024 * 1024, // 10MB
  maxEntries: 5000,
  ttl: 60 * 60 * 1000, // 1時間
});

/**
 * メモリ使用量監視
 */
export function monitorMemoryUsage() {
  const memUsage = process.memoryUsage();
  const totalCacheSize = 
    audioCache.size().bytes + 
    lipSyncCache.size().bytes + 
    phonemeCache.size().bytes;
  
  logger.info('Memory usage', {
    rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
    cacheSize: `${(totalCacheSize / 1024 / 1024).toFixed(2)} MB`,
    audioCache: audioCache.getStats(),
    lipSyncCache: lipSyncCache.getStats(),
    phonemeCache: phonemeCache.getStats()
  });
  
  // メモリ使用量が閾値を超えた場合の警告
  if (memUsage.heapUsed > memUsage.heapTotal * 0.9) {
    logger.warn('High memory usage detected', {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal
    });
    
    // 必要に応じてキャッシュをクリア
    if (memUsage.heapUsed > memUsage.heapTotal * 0.95) {
      audioCache.clear();
      lipSyncCache.clear();
      phonemeCache.clear();
      logger.warn('Emergency cache clear due to high memory usage');
    }
  }
}

// 定期的なメモリ監視（5分ごと）
if (process.env.NODE_ENV === 'production') {
  setInterval(monitorMemoryUsage, 5 * 60 * 1000);
}