import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SleeperNFLState } from '../models/sleeper-models.js';

/**
 * Represents a historical cache entry with metadata.
 * @template T - The type of the cached value
 */
interface HistoricalCacheEntry<T> {
  /** The cached data value */
  value: T;
  /** ISO string timestamp of when the data was cached */
  cachedAt: string;
  /** Type classification for organizational purposes */
  dataType: string;
  /** Optional season identifier */
  season?: string;
  /** Optional week number */
  week?: number;
}

/**
 * Interface defining the contract for historical cache service operations.
 * Provides long-term caching specifically designed for fantasy football historical data.
 */
export interface IHistoricalCacheService {
  /** Retrieves historical cached data by key */
  getHistorical<T>(key: string): Promise<T | null>;
  /** Stores data in historical cache with metadata */
  setHistorical<T>(key: string, value: T, dataType: string, season?: string, week?: number): Promise<void>;
  /** Gets cached data or computes and caches new data if not found */
  getOrSetHistorical<T>(
    key: string,
    factory: () => Promise<T>,
    dataType: string,
    season?: string,
    week?: number
  ): Promise<T>;
  /** Determines if data should be treated as historical */
  isHistoricalData(season: string, week?: number): Promise<boolean>;
  /** Clears historical cache with optional pattern filtering */
  clearHistorical(pattern?: string): Promise<void>;
  /** Retrieves current NFL season state */
  getCurrentNFLState(): Promise<SleeperNFLState | null>;
}

/**
 * Service for managing long-term historical fantasy football data caching.
 * Organizes cache by data type, season, and week for efficient retrieval
 * and automatic determination of historical vs current data.
 */
export class HistoricalCacheService implements IHistoricalCacheService {
  private readonly cacheDir: string;
  private nflStateCache: { state: SleeperNFLState; cachedAt: number } | null = null;
  private readonly NFL_STATE_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

  /**
   * Creates a new HistoricalCacheService instance.
   * @param sleeperClient - Client for retrieving NFL state information
   */
  constructor(private sleeperClient: any) {
    // Use a more robust cache directory path that works in various environments
    const baseDir = process.env.GANDALF_CACHE_DIR || 
                   (process.env.HOME ? path.join(process.env.HOME, '.gandalf-cache') : 
                   (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.gandalf-cache') : 
                   path.join(process.cwd(), 'cache')));
    
    this.cacheDir = baseDir;
    this.ensureCacheDirectories();
  }

  /**
   * Ensures all required cache directories exist, creating them if necessary.
   */
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
        try {
          fs.mkdirSync(dir, { recursive: true });
          console.error(`Created cache directory: ${dir}`);
        } catch (error) {
          const platformInfo = `${os.platform()} ${os.arch()}`;
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(
            `Failed to create cache directory on ${platformInfo}. ` +
            `Path: ${dir}, Error: ${errorMessage}. ` +
            `Check directory permissions and available disk space.`
          );
        }
      }
    }
  }

  /**
   * Retrieves current NFL season state with memory caching.
   * @returns Promise resolving to current NFL state or null if unavailable
   * @example
   * ```typescript
   * const nflState = await historicalCache.getCurrentNFLState();
   * console.log(`Current season: ${nflState?.season}, week: ${nflState?.week}`);
   * ```
   */
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

  /**
   * Determines whether given season/week data should be treated as historical.
   * @param season - Season year as string
   * @param week - Optional week number
   * @returns Promise resolving to true if data is historical, false if current
   * @example
   * ```typescript
   * const isHistorical = await historicalCache.isHistoricalData('2023', 10);
   * ```
   */
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

  /**
   * Generates the file system path for a historical cache entry.
   * @param key - Cache key identifier
   * @param dataType - Type of data (leagues, drafts, matchups, etc.)
   * @param season - Optional season for organization
   * @param _week - Optional week (currently unused in path generation)
   * @returns Full file path for the cache entry
   */
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
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (error) {
        const platformInfo = `${os.platform()} ${os.arch()}`;
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to create cache subdirectory on ${platformInfo}. ` +
          `Path: ${dir}, Error: ${errorMessage}. ` +
          `Check directory permissions and available disk space.`
        );
      }
    }

    return filePath;
  }

  /**
   * Retrieves data from historical cache by key.
   * @param key - Cache key to retrieve
   * @returns Promise resolving to cached data or null if not found
   * @example
   * ```typescript
   * const matchups = await historicalCache.getHistorical<MatchupData>('league_123_week_1_matchups');
   * ```
   */
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

  /**
   * Stores data in historical cache with metadata.
   * @param key - Cache key identifier
   * @param value - Data to cache
   * @param dataType - Type classification for organization
   * @param season - Optional season identifier
   * @param week - Optional week number
   * @returns Promise that resolves when data is cached
   * @example
   * ```typescript
   * await historicalCache.setHistorical('league_123_week_1_matchups', matchupData, 'matchups', '2023', 1);
   * ```
   */
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

  /**
   * Gets cached data or computes and caches new data if not found.
   * @param key - Cache key identifier
   * @param factory - Function to compute data if cache miss
   * @param dataType - Type classification for organization
   * @param season - Optional season identifier
   * @param week - Optional week number
   * @returns Promise resolving to cached or newly computed data
   * @example
   * ```typescript
   * const matchups = await historicalCache.getOrSetHistorical(
   *   'league_123_week_1_matchups',
   *   () => api.getMatchups('123', 1),
   *   'matchups',
   *   '2023',
   *   1
   * );
   * ```
   */
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

  /**
   * Extracts data type from cache key based on key patterns.
   * @param key - Cache key to analyze
   * @returns Data type classification
   */
  private extractDataTypeFromKey(key: string): string {
    if (key.includes('_leagues_')) {return 'leagues';}
    if (key.startsWith('draft_')) {return 'drafts';}
    if (key.includes('_matchups')) {return 'matchups';}
    if (key.includes('_transactions')) {return 'transactions';}
    if (key.includes('_rosters')) {return 'rosters';}
    return 'general';
  }

  /**
   * Extracts season and week information from cache key.
   * @param key - Cache key to parse
   * @returns Object containing extracted season and week
   */
  private extractSeasonWeekFromKey(key: string): { season?: string; week?: number } {
    const seasonMatch = key.match(/_(\d{4})(?:_|$)/);
    const weekMatch = key.match(/week_(\d+)/);
    
    return {
      season: seasonMatch ? seasonMatch[1] : undefined,
      week: weekMatch ? parseInt(weekMatch[1]) : undefined
    };
  }

  /**
   * Clears historical cache data with optional pattern filtering.
   * @param pattern - Optional pattern for selective clearing (not yet implemented)
   * @returns Promise that resolves when clearing is complete
   * @example
   * ```typescript
   * await historicalCache.clearHistorical(); // Clears all historical cache
   * ```
   */
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