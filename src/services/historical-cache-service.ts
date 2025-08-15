import * as fs from 'fs';
import * as path from 'path';
import { SleeperNFLState } from '../models/sleeper-models.js';

interface HistoricalCacheEntry<T> {
  value: T;
  cachedAt: string;
  dataType: string;
  season?: string;
  week?: number;
}

export interface IHistoricalCacheService {
  getHistorical<T>(key: string): Promise<T | null>;
  setHistorical<T>(key: string, value: T, dataType: string, season?: string, week?: number): Promise<void>;
  getOrSetHistorical<T>(
    key: string,
    factory: () => Promise<T>,
    dataType: string,
    season?: string,
    week?: number
  ): Promise<T>;
  isHistoricalData(season: string, week?: number): Promise<boolean>;
  clearHistorical(pattern?: string): Promise<void>;
  getCurrentNFLState(): Promise<SleeperNFLState | null>;
}

export class HistoricalCacheService implements IHistoricalCacheService {
  private readonly cacheDir: string;
  private nflStateCache: { state: SleeperNFLState; cachedAt: number } | null = null;
  private readonly NFL_STATE_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

  constructor(private sleeperClient: any) {
    this.cacheDir = path.join(process.cwd(), 'cache');
    this.ensureCacheDirectories();
  }

  private ensureCacheDirectories(): void {
    const directories = [
      this.cacheDir,
      path.join(this.cacheDir, 'historical'),
      path.join(this.cacheDir, 'historical', 'leagues'),
      path.join(this.cacheDir, 'historical', 'drafts'), 
      path.join(this.cacheDir, 'historical', 'matchups'),
      path.join(this.cacheDir, 'historical', 'transactions'),
      path.join(this.cacheDir, 'historical', 'rosters'),
      path.join(this.cacheDir, 'current') // For current season data
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.error(`Created cache directory: ${dir}`);
      }
    }
  }

  async getCurrentNFLState(): Promise<SleeperNFLState | null> {
    // Use cached NFL state if available and not expired
    if (this.nflStateCache && 
        Date.now() - this.nflStateCache.cachedAt < this.NFL_STATE_CACHE_TTL) {
      return this.nflStateCache.state;
    }

    try {
      const state = await this.sleeperClient.getNFLState();
      if (state) {
        this.nflStateCache = {
          state,
          cachedAt: Date.now()
        };
      }
      return state;
    } catch (error) {
      console.error('Error fetching NFL state:', error);
      return this.nflStateCache?.state || null;
    }
  }

  async isHistoricalData(season: string, week?: number): Promise<boolean> {
    const nflState = await this.getCurrentNFLState();
    if (!nflState) {
      // If we can't get current state, assume it's current data to be safe
      return false;
    }

    const currentSeason = nflState.season;
    const currentWeek = nflState.week;

    // Data from previous seasons is always historical
    if (season < currentSeason) {
      return true;
    }

    // Data from current season but previous weeks is historical
    return !!(season === currentSeason && week && week < currentWeek);
  }

  private getFilePath(key: string, dataType: string, season?: string, _week?: number): string {
    let filePath: string;

    switch (dataType) {
      case 'leagues':
        // cache/historical/leagues/2023/user_123_leagues_nfl_2023.json
        filePath = path.join(this.cacheDir, 'historical', 'leagues', season || 'unknown', `${key}.json`);
        break;
      case 'drafts':
        // cache/historical/drafts/draft_123.json or draft_123_picks.json
        filePath = path.join(this.cacheDir, 'historical', 'drafts', `${key}.json`);
        break;
      case 'matchups':
        // cache/historical/matchups/2023/league_123_week_1_matchups.json
        filePath = path.join(this.cacheDir, 'historical', 'matchups', season || 'unknown', `${key}.json`);
        break;
      case 'transactions':
        // cache/historical/transactions/2023/league_123_week_1_transactions.json
        filePath = path.join(this.cacheDir, 'historical', 'transactions', season || 'unknown', `${key}.json`);
        break;
      case 'rosters':
        // cache/historical/rosters/2023/league_123_week_1_rosters.json
        filePath = path.join(this.cacheDir, 'historical', 'rosters', season || 'unknown', `${key}.json`);
        break;
      default:
        // Fallback to general historical folder
        filePath = path.join(this.cacheDir, 'historical', `${key}.json`);
    }

    // Ensure the directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return filePath;
  }

  async getHistorical<T>(key: string): Promise<T | null> {
    // We need to determine the data type from the key to find the right file
    const dataType = this.extractDataTypeFromKey(key);
    const { season, week } = this.extractSeasonWeekFromKey(key);
    
    const filePath = this.getFilePath(key, dataType, season, week);

    try {
      if (!fs.existsSync(filePath)) {
        console.error(`Historical cache miss: ${key} (file not found: ${filePath})`);
        return null;
      }

      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const cacheEntry: HistoricalCacheEntry<T> = JSON.parse(fileContent);
      
      console.error(`Historical cache hit: ${key} (cached at: ${cacheEntry.cachedAt})`);
      return cacheEntry.value;
    } catch (error) {
      console.warn(`Failed to read historical cache for key ${key}:`, error);
      return null;
    }
  }

  async setHistorical<T>(
    key: string, 
    value: T, 
    dataType: string, 
    season?: string, 
    week?: number
  ): Promise<void> {
    try {
      const cacheEntry: HistoricalCacheEntry<T> = {
        value,
        cachedAt: new Date().toISOString(),
        dataType,
        season,
        week
      };

      const filePath = this.getFilePath(key, dataType, season, week);
      await fs.promises.writeFile(filePath, JSON.stringify(cacheEntry, null, 2), 'utf8');
      
      console.error(`Historical cache set: ${key} -> ${filePath}`);
    } catch (error) {
      console.warn(`Failed to save historical cache for key ${key}:`, error);
    }
  }

  async getOrSetHistorical<T>(
    key: string,
    factory: () => Promise<T>,
    dataType: string,
    season?: string,
    week?: number
  ): Promise<T> {
    const cached = await this.getHistorical<T>(key);
    if (cached !== null) {
      return cached;
    }

    console.error(`Fetching and caching historical data: ${key}`);
    const value = await factory();
    await this.setHistorical(key, value, dataType, season, week);
    return value;
  }

  private extractDataTypeFromKey(key: string): string {
    if (key.includes('_leagues_')) {return 'leagues';}
    if (key.startsWith('draft_')) {return 'drafts';}
    if (key.includes('_matchups')) {return 'matchups';}
    if (key.includes('_transactions')) {return 'transactions';}
    if (key.includes('_rosters')) {return 'rosters';}
    return 'general';
  }

  private extractSeasonWeekFromKey(key: string): { season?: string; week?: number } {
    const seasonMatch = key.match(/_(\d{4})(?:_|$)/);
    const weekMatch = key.match(/week_(\d+)/);
    
    return {
      season: seasonMatch ? seasonMatch[1] : undefined,
      week: weekMatch ? parseInt(weekMatch[1]) : undefined
    };
  }

  async clearHistorical(pattern?: string): Promise<void> {
    try {
      const historicalDir = path.join(this.cacheDir, 'historical');
      
      if (pattern) {
        // Clear specific pattern - this would need more sophisticated implementation
        console.error(`Clearing historical cache with pattern: ${pattern}`);
        // TODO: Implement pattern-based clearing
      } else {
        // Clear all historical cache
        if (fs.existsSync(historicalDir)) {
          await fs.promises.rm(historicalDir, { recursive: true, force: true });
          console.error('Cleared all historical cache');
          // Recreate the directory structure
          this.ensureCacheDirectories();
        }
      }
    } catch (error) {
      console.warn('Failed to clear historical cache:', error);
    }
  }
}