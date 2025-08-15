import * as fs from 'fs';
import * as path from 'path';

interface CacheEntry<T> {
  value: T;
  expiresAt: Date;
}

interface FileCacheEntry<T> {
  value: T;
  cachedAt: string;
  expiresAt: string;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, expirationSeconds: number): Promise<void>;
  getOrSet<T>(key: string, factory: () => Promise<T>, expirationSeconds: number): Promise<T>;
  clear(): void;
}

export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly cacheDir: string;

  constructor() {
    // Set up cache directory
    this.cacheDir = path.join(process.cwd(), 'cache');
    this.ensureCacheDirectory();
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
      this.cleanupExpiredFiles().catch(error => {
        console.error('Error during cache file cleanup:', error);
      });
    }, 5 * 60 * 1000);
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.error(`Created cache directory: ${this.cacheDir}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const entry = this.cache.get(key);
    
    if (entry) {
      if (entry.expiresAt > new Date()) {
        console.error(`Memory cache hit for key: ${key}`);
        return entry.value as T;
      }
      
      console.error(`Memory cache expired for key: ${key}`);
      this.cache.delete(key);
    }
    
    // Check file cache if memory cache miss/expired
    const fileEntry = await this.getFromFile<T>(key);
    if (fileEntry) {
      // Load back into memory cache with remaining time
      const remainingSeconds = Math.max(0, Math.floor((fileEntry.expiresAt.getTime() - Date.now()) / 1000));
      
      if (remainingSeconds > 0) {
        // Only store in memory if not already expired
        const memoryEntry: CacheEntry<T> = {
          value: fileEntry.value,
          expiresAt: fileEntry.expiresAt
        };
        this.cache.set(key, memoryEntry);
        console.error(`File cache hit for key: ${key}, loaded into memory with ${remainingSeconds}s remaining`);
        return fileEntry.value;
      }
    }
    
    console.error(`Cache miss (both memory and file) for key: ${key}`);
    return null;
  }

  async set<T>(key: string, value: T, expirationSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000);
    
    // Set in memory cache
    const entry: CacheEntry<T> = {
      value,
      expiresAt
    };
    
    this.cache.set(key, entry);
    
    // Set in file cache (especially important for large data like players)
    await this.saveToFile(key, value, expiresAt);
    
    console.error(`Cache set for key: ${key}, expires at: ${expiresAt.toISOString()}`);
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, expirationSeconds: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {return cached;}
    
    const value = await factory();
    await this.set(key, value, expirationSeconds);
    return value;
  }

  clear(): void {
    this.cache.clear();
    console.error('Cache cleared');
  }

  private cleanup(): void {
    const now = new Date();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.error(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }

  private getFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  private async saveToFile<T>(key: string, value: T, expiresAt: Date): Promise<void> {
    try {
      const fileCacheEntry: FileCacheEntry<T> = {
        value,
        cachedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      const filePath = this.getFilePath(key);
      await fs.promises.writeFile(filePath, JSON.stringify(fileCacheEntry), 'utf8');
      console.error(`Saved to file cache: ${filePath}`);
    } catch (error) {
      console.warn(`Failed to save cache to file for key ${key}:`, error);
    }
  }

  private async getFromFile<T>(key: string): Promise<{ value: T; expiresAt: Date } | null> {
    try {
      const filePath = this.getFilePath(key);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const fileCacheEntry: FileCacheEntry<T> = JSON.parse(fileContent);
      
      const expiresAt = new Date(fileCacheEntry.expiresAt);
      if (expiresAt <= new Date()) {
        console.error(`File cache expired for key: ${key}`);
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

      if (cleanedCount > 0) {
        console.error(`Cleaned up ${cleanedCount} expired cache files`);
      }
    } catch (error) {
      console.warn('Failed to cleanup expired cache files:', error);
    }
  }
}