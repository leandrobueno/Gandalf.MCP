import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Represents a cache entry stored in memory with expiration information.
 * @template T - The type of the cached value
 */
interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** The expiration date for this entry */
  expiresAt: Date;
}

/**
 * Represents a cache entry stored in file system with serialized dates.
 * @template T - The type of the cached value
 */
interface FileCacheEntry<T> {
  /** The cached value */
  value: T;
  /** ISO string timestamp of when the value was cached */
  cachedAt: string;
  /** ISO string timestamp of when the value expires */
  expiresAt: string;
}

/**
 * Interface defining the contract for cache service implementations.
 * Provides basic caching operations with expiration support.
 */
export interface ICacheService {
  /** Retrieves a cached value by key */
  get<T>(key: string): Promise<T | null>;
  /** Stores a value in cache with expiration */
  set<T>(key: string, value: T, expirationSeconds: number): Promise<void>;
  /** Gets cached value or computes and caches new value if not found */
  getOrSet<T>(key: string, factory: () => Promise<T>, expirationSeconds: number): Promise<T>;
  /** Clears all cached entries */
  clear(): void;
}

/**
 * LRU cache entry with additional tracking for eviction strategy.
 * @template T - The type of the cached value
 */
interface LRUCacheEntry<T> extends CacheEntry<T> {
  /** Last access timestamp for LRU eviction */
  lastAccessed: number;
}

/**
 * A two-tier caching service that uses both memory and file system storage.
 * Provides fast memory access for frequently used data with persistent file backup.
 * Automatically handles cache expiration and cleanup for both storage tiers.
 * Implements LRU eviction when cache size limits are exceeded.
 */
export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, LRUCacheEntry<any>>();
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly cacheDir: string;
  private readonly maxCacheSize: number = 1000; // Maximum number of entries in memory
  private readonly enableVerboseLogging: boolean = false; // Reduce logging in production

  /**
   * Creates a new MemoryCacheService instance.
   * Initializes cache directory and starts automatic cleanup timer.
   * @example
   * ```typescript
   * const cacheService = new MemoryCacheService();
   * ```
   */
  constructor() {
    // Use a more robust cache directory path that works in various environments
    const baseDir = process.env.GANDALF_CACHE_DIR || 
                   (process.env.HOME ? path.join(process.env.HOME, '.gandalf-cache') : 
                   (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.gandalf-cache') : 
                   path.join(process.cwd(), 'cache')));
    
    this.cacheDir = baseDir;
    this.ensureCacheDirectory().catch(error => {
      console.error('Error creating cache directory:', error);
    });
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
      this.cleanupExpiredFiles().catch(error => {
        console.error('Error during cache file cleanup:', error);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Ensures the cache directory exists, creating it if necessary.
   * Uses async file operations to avoid blocking the event loop.
   */
  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.promises.access(this.cacheDir);
    } catch {
      try {
        await fs.promises.mkdir(this.cacheDir, { recursive: true });
        if (this.enableVerboseLogging) {
          console.error(`Created cache directory: ${this.cacheDir}`);
        }
      } catch (error) {
        const platformInfo = `${os.platform()} ${os.arch()}`;
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to create cache directory on ${platformInfo}. ` +
          `Path: ${this.cacheDir}, Error: ${errorMessage}. ` +
          `Check directory permissions and available disk space.`
        );
      }
    }
  }

  /**
   * Retrieves a cached value by key, checking both memory and file storage.
   * @param key - The cache key to retrieve
   * @returns Promise resolving to the cached value or null if not found/expired
   * @example
   * ```typescript
   * const cachedData = await cacheService.get<PlayerData>('player_123');
   * if (cachedData) {
   *   console.log('Found cached player:', cachedData.name);
   * }
   * ```
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const entry = this.cache.get(key);
    
    if (entry) {
      if (entry.expiresAt > new Date()) {
        // Update last accessed time for LRU
        entry.lastAccessed = Date.now();
        this.cache.set(key, entry); // Move to end of Map for LRU
        return entry.value as T;
      }
      
      this.cache.delete(key);
    }
    
    // Check file cache if memory cache miss/expired
    const fileEntry = await this.getFromFile<T>(key);
    if (fileEntry) {
      // Load back into memory cache with remaining time
      const remainingSeconds = Math.max(0, Math.floor((fileEntry.expiresAt.getTime() - Date.now()) / 1000));
      
      if (remainingSeconds > 0) {
        // Only store in memory if not already expired
        const memoryEntry: LRUCacheEntry<T> = {
          value: fileEntry.value,
          expiresAt: fileEntry.expiresAt,
          lastAccessed: Date.now()
        };
        
        // Ensure cache size limit before adding
        this.enforceCacheSize();
        this.cache.set(key, memoryEntry);
        return fileEntry.value;
      }
    }
    
    return null;
  }

  /**
   * Stores a value in both memory and file cache with specified expiration.
   * @param key - The cache key for the value
   * @param value - The value to cache
   * @param expirationSeconds - Time in seconds until the cached value expires
   * @returns Promise that resolves when the value is cached
   * @example
   * ```typescript
   * await cacheService.set('players_nfl', playersData, 3600); // Cache for 1 hour
   * ```
   */
  async set<T>(key: string, value: T, expirationSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000);
    
    // Set in memory cache with LRU tracking
    const entry: LRUCacheEntry<T> = {
      value,
      expiresAt,
      lastAccessed: Date.now()
    };
    
    // Ensure cache size limit before adding
    this.enforceCacheSize();
    this.cache.set(key, entry);
    
    // Set in file cache (especially important for large data like players)
    await this.saveToFile(key, value, expiresAt);
  }

  /**
   * Gets a cached value or computes and caches a new value if not found.
   * @param key - The cache key to check
   * @param factory - Function to compute the value if not cached
   * @param expirationSeconds - Time in seconds to cache the computed value
   * @returns Promise resolving to the cached or newly computed value
   * @example
   * ```typescript
   * const players = await cacheService.getOrSet(
   *   'nfl_players',
   *   () => api.getAllPlayers(),
   *   3600
   * );
   * ```
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, expirationSeconds: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {return cached;}
    
    const value = await factory();
    await this.set(key, value, expirationSeconds);
    return value;
  }

  /**
   * Clears all cached entries from memory.
   * Note: This does not clear the file cache.
   * @example
   * ```typescript
   * cacheService.clear(); // Clears all in-memory cache
   * ```
   */
  clear(): void {
    this.cache.clear();
    if (this.enableVerboseLogging) {
      console.error('Cache cleared');
    }
  }

  /**
   * Removes expired entries from the memory cache.
   */
  private cleanup(): void {
    const now = new Date();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0 && this.enableVerboseLogging) {
      console.error(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Enforces cache size limits using LRU eviction strategy.
   * Removes least recently used entries when cache exceeds maximum size.
   */
  private enforceCacheSize(): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Find least recently used entry
      let oldestKey: string | null = null;
      let oldestTime = Date.now();
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Destroys the cache service, clearing all data and stopping cleanup timers.
   * Should be called when shutting down the application.
   * @example
   * ```typescript
   * cacheService.destroy(); // Clean shutdown
   * ```
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }

  /**
   * Generates the file system path for a cache key.
   * @param key - The cache key
   * @returns The full file path for the cache entry
   */
  private getFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Saves a cache entry to the file system for persistence.
   * @param key - The cache key
   * @param value - The value to save
   * @param expiresAt - The expiration date
   */
  private async saveToFile<T>(key: string, value: T, expiresAt: Date): Promise<void> {
    try {
      const fileCacheEntry: FileCacheEntry<T> = {
        value,
        cachedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      const filePath = this.getFilePath(key);
      await fs.promises.writeFile(filePath, JSON.stringify(fileCacheEntry), 'utf8');
      if (this.enableVerboseLogging) {
        console.error(`Saved to file cache: ${filePath}`);
      }
    } catch (error) {
      console.warn(`Failed to save cache to file for key ${key}:`, error);
    }
  }

  /**
   * Retrieves a cache entry from the file system.
   * @param key - The cache key to retrieve
   * @returns The cached value and expiration date, or null if not found/expired
   */
  private async getFromFile<T>(key: string): Promise<{ value: T; expiresAt: Date } | null> {
    try {
      const filePath = this.getFilePath(key);
      
      // Use async stat instead of sync existsSync
      try {
        await fs.promises.access(filePath);
      } catch {
        return null;
      }

      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const fileCacheEntry: FileCacheEntry<T> = JSON.parse(fileContent);
      
      const expiresAt = new Date(fileCacheEntry.expiresAt);
      if (expiresAt <= new Date()) {
        if (this.enableVerboseLogging) {
          console.error(`File cache expired for key: ${key}`);
        }
        // Delete expired file
        await fs.promises.unlink(filePath).catch(() => {});
        return null;
      }

      return { value: fileCacheEntry.value, expiresAt };
    } catch (error) {
      console.warn(`Failed to read cache from file for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Removes expired cache files from the file system.
   */
  private async cleanupExpiredFiles(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.cacheDir);
      const now = new Date();
      let cleanedCount = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) {continue;}

        const filePath = path.join(this.cacheDir, file);
        try {
          const fileContent = await fs.promises.readFile(filePath, 'utf8');
          const fileCacheEntry: FileCacheEntry<any> = JSON.parse(fileContent);
          
          const expiresAt = new Date(fileCacheEntry.expiresAt);
          if (expiresAt <= now) {
            await fs.promises.unlink(filePath);
            cleanedCount++;
          }
        } catch {
          // If we can't parse the file, delete it
          await fs.promises.unlink(filePath).catch(() => {});
          cleanedCount++;
        }
      }

      if (cleanedCount > 0 && this.enableVerboseLogging) {
        console.error(`Cleaned up ${cleanedCount} expired cache files`);
      }
    } catch (error) {
      console.warn('Failed to cleanup expired cache files:', error);
    }
  }
}