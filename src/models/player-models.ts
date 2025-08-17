/**
 * @fileoverview Player data and search models for fantasy football player management.
 * Contains service interfaces, search options, player details, and trending player data.
 */

/**
 * Service interface for player data operations.
 * Provides methods to search, retrieve, and analyze player information.
 */
export interface IPlayerService {
  /**
   * Searches for players based on various criteria.
   * @param options - Optional search filters and parameters
   * @returns Promise resolving to search results with matching players
   */
  searchPlayers(options?: PlayerSearchOptions): Promise<PlayerSearchResult>;
  
  /**
   * Retrieves detailed information for a specific player.
   * @param playerIdOrName - Either player ID or player name to search for
   * @returns Promise resolving to detailed player info or null if not found
   */
  getPlayer(playerIdOrName: string): Promise<PlayerDetails | null>;
  
  /**
   * Gets trending players based on add/drop activity.
   * @param options - Optional parameters for trending analysis
   * @returns Promise resolving to trending player data
   */
  getTrendingPlayers(options?: TrendingPlayerOptions): Promise<TrendingPlayerResult>;
  
  /**
   * Retrieves multiple players by their IDs in a single batch operation.
   * More efficient than multiple individual getPlayer calls.
   * @param playerIds - Array of player IDs to retrieve
   * @returns Promise resolving to map of player ID to player details
   */
  getPlayersBatch(playerIds: string[]): Promise<Map<string, PlayerDetails | null>>;
}

/**
 * Options for filtering and configuring player searches.
 * All parameters are optional to allow flexible searching.
 */
export interface PlayerSearchOptions {
  /** Text query to search player names */
  query?: string;
  /** Filter by specific position (QB, RB, WR, TE, K, DEF) */
  position?: string;
  /** Filter by NFL team abbreviation */
  team?: string;
  /** Maximum number of results to return (defaults to system limit) */
  maxResults?: number;
}

/**
 * Result of a player search operation.
 * Contains matching players and applied filter information.
 */
export interface PlayerSearchResult {
  /** Total number of players found matching the criteria */
  totalFound: number;
  /** Array of players matching the search criteria */
  players: PlayerSummary[];
  /** Echo of the filters that were applied to the search */
  filters?: {
    /** Text query that was searched */
    query?: string;
    /** Position filter that was applied */
    position?: string;
    /** Team filter that was applied */
    team?: string;
  };
}

/**
 * Summary view of a player for search results and listings.
 * Contains key identifying information and fantasy relevance.
 */
export interface PlayerSummary {
  /** Unique identifier for the player */
  playerId: string;
  /** Player's full name */
  fullName: string;
  /** Player's primary position */
  position?: string;
  /** Player's current NFL team abbreviation */
  team?: string;
  /** Array of positions eligible for fantasy purposes */
  fantasyPositions?: string[];
  /** Player's age in years */
  age?: number;
  /** Number of years of NFL experience */
  yearsExp?: number;
  /** Current injury status */
  injuryStatus?: string;
  /** Search ranking/popularity score */
  searchRank?: number;
}

/**
 * Detailed player information with complete biographical and team data.
 * Extended version of PlayerSummary with additional attributes.
 */
export interface PlayerDetails {
  /** Unique identifier for the player */
  playerId: string;
  /** Player's full name */
  fullName: string;
  /** Player's first name */
  firstName?: string;
  /** Player's last name */
  lastName?: string;
  /** Player's primary position */
  position?: string;
  /** Player's current NFL team abbreviation */
  team?: string;
  /** Array of fantasy-eligible positions */
  fantasyPositions?: string[];
  /** Player's age in years */
  age?: number;
  /** Number of years of NFL experience */
  yearsExp?: number;
  /** Player roster status (Active, Inactive, PracticeSquad, etc.) */
  status?: string;
  /** Current injury designation */
  injuryStatus?: string;
  /** Player's jersey number */
  number?: number;
  /** Position on team depth chart (1=starter, 2=backup, etc.) */
  depthChartOrder?: number;
  /** Specific depth chart position designation */
  depthChartPosition?: string;
  /** Search popularity ranking */
  searchRank?: number;
}

/**
 * Options for configuring trending player analysis.
 * Controls what type of trending data to retrieve.
 */
export interface TrendingPlayerOptions {
  /** Type of trending activity to analyze */
  type?: 'add' | 'drop';
  /** Time window in hours to analyze (default varies by platform) */
  hours?: number;
  /** Maximum number of trending players to return */
  limit?: number;
}

/**
 * Result of trending player analysis.
 * Shows players with highest add/drop activity in specified timeframe.
 */
export interface TrendingPlayerResult {
  /** Type of trending activity analyzed */
  type: 'add' | 'drop';
  /** Time window that was analyzed in hours */
  hours: number;
  /** Total number of trending players found */
  totalCount: number;
  /** Array of trending players sorted by activity volume */
  players: TrendingPlayer[];
}

/**
 * A player showing significant trending activity.
 * Includes basic player info and activity metrics.
 */
export interface TrendingPlayer {
  /** Unique identifier for the trending player */
  playerId: string;
  /** Number of add/drop transactions in the analyzed timeframe */
  count: number;
  /** Player's full name */
  fullName?: string;
  /** Player's primary position */
  position?: string;
  /** Player's current NFL team */
  team?: string;
  /** Current injury status affecting trending activity */
  injuryStatus?: string;
}