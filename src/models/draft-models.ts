/**
 * @fileoverview Draft management models and service interfaces for fantasy football drafts.
 * Contains models for draft information, picks, available players, and draft intelligence data.
 */

/**
 * Service interface for draft management operations.
 * Provides methods to retrieve draft information, picks, and available players.
 */
export interface IDraftService {
  /**
   * Retrieves complete draft information including all picks.
   * @param leagueId - Unique identifier for the league
   * @returns Promise resolving to complete draft information with picks
   */
  getLeagueDraft(leagueId: string): Promise<DraftInfo>;
  
  /**
   * Retrieves basic draft information without picks data.
   * @param leagueId - Unique identifier for the league
   * @param seasonOptions - Optional season filtering parameters
   * @returns Promise resolving to draft configuration and metadata
   */
  getLeagueDraftInformation(leagueId: string, seasonOptions?: SeasonOptions): Promise<DraftInformation>;
  
  /**
   * Retrieves draft picks with optional filtering.
   * @param leagueId - Unique identifier for the league
   * @param options - Optional filters for picks (player, round, roster, etc.)
   * @returns Promise resolving to filtered draft picks
   */
  getLeagueDraftPicks(leagueId: string, options?: DraftPicksOptions): Promise<DraftPicksResult>;
  
  /**
   * Retrieves available (undrafted) players for a draft.
   * @param draftId - Unique identifier for the draft
   * @param options - Optional filters and intelligence options
   * @returns Promise resolving to available players with optional intelligence data
   */
  getDraftAvailablePlayers(draftId: string, options?: DraftPlayerOptions): Promise<DraftPlayerResult>;
}

/**
 * Complete draft information including all picks.
 * Comprehensive view of a draft with full pick history.
 */
export interface DraftInfo {
  /** Unique identifier for the draft */
  draftId: string;
  /** League this draft belongs to */
  leagueId: string;
  /** Current draft status (pre_draft, drafting, complete) */
  status: string;
  /** Type of draft (snake, linear, auction) */
  type: string;
  /** Draft configuration settings */
  settings?: any;
  /** ISO timestamp when draft was created */
  created: string;
  /** ISO timestamp when draft started or null if not started */
  startTime: string | null;
  /** Additional draft metadata and state information */
  metadata?: any;
  /** Total number of picks in the draft */
  totalPicks: number;
  /** Array of all draft picks */
  picks: DraftPick[];
}

/**
 * Basic draft information without picks data.
 * Lightweight view focusing on draft configuration and structure.
 */
export interface DraftInformation {
  /** Unique identifier for the draft */
  draftId: string;
  /** League this draft belongs to */
  leagueId: string;
  /** Current draft status */
  status: string;
  /** Type of draft */
  type: string;
  /** Draft configuration settings */
  settings?: any;
  /** ISO timestamp when draft was created */
  created: string;
  /** ISO timestamp when draft started or null if not started */
  startTime: string | null;
  /** Additional draft metadata */
  metadata?: any;
  /** Total number of picks in the draft */
  totalPicks: number;
  /** Total number of draft rounds */
  totalRounds: number;
  /** Total number of teams participating */
  totalTeams: number;
}

/**
 * Individual draft pick information.
 * Represents a single selection in the draft.
 */
export interface DraftPick {
  /** Round number (1-indexed) */
  round: number;
  /** Overall pick number (1-indexed) */
  pickNo: number;
  /** Draft position/slot of the team making this pick */
  draftSlot: number;
  /** ID of the selected player (null if pick not yet made) */
  playerId?: string;
  /** User ID of the person who made the pick */
  pickedBy?: string;
  /** Roster ID that owns this pick */
  rosterId?: number;
  /** Whether this pick was used for a keeper player */
  isKeeper?: boolean;
  /** Additional pick metadata and player information */
  metadata?: any;
}

/**
 * Options for filtering draft data by season.
 * Used to scope draft queries to specific time periods.
 */
export interface SeasonOptions {
  /** Target season year (e.g., "2024") */
  season?: string;
  /** Start date for season range filtering */
  seasonStart?: string;
  /** End date for season range filtering */
  seasonEnd?: string;
  /** Number of seasons to include in results */
  seasonCount?: number;
}

/**
 * Options for filtering draft picks queries.
 * Extends SeasonOptions with pick-specific filters.
 */
export interface DraftPicksOptions extends SeasonOptions {
  /** Filter picks by specific player ID */
  playerId?: string;
  /** Filter picks by round number */
  round?: number;
  /** Filter picks by roster/team ID */
  rosterId?: number;
  /** Filter picks by user who made the pick */
  pickedBy?: string;
}

/**
 * Result of a filtered draft picks query.
 * Contains picks matching the specified criteria.
 */
export interface DraftPicksResult {
  /** Draft these picks belong to */
  draftId: string;
  /** League the draft belongs to */
  leagueId: string;
  /** Total number of picks in the entire draft */
  totalPicks: number;
  /** Number of picks matching the applied filters */
  filteredPicks: number;
  /** Array of picks matching the filter criteria */
  picks: DraftPick[];
  /** Echo of the filters that were applied */
  filters?: DraftPicksOptions;
}

/**
 * Options for filtering and configuring available players queries.
 * Controls which undrafted players to return and what data to include.
 */
export interface DraftPlayerOptions {
  /** Filter by player position */
  position?: string;
  /** Filter by NFL team */
  team?: string;
  /** Text search query for player names */
  query?: string;
  /** Maximum number of players to return */
  maxResults?: number;
  /** Whether to include player intelligence data */
  includeIntelligence?: boolean;
  /** Scoring format for rankings and projections */
  scoringFormat?: 'standard' | 'ppr' | 'half-ppr';
}

/**
 * Result of available players query for a draft.
 * Contains undrafted players available for selection.
 */
export interface DraftPlayerResult {
  /** Draft these players are available for */
  draftId: string;
  /** Total number of players already drafted */
  totalDraftedPlayers: number;
  /** Array of available (undrafted) players */
  availablePlayers: DraftPlayer[];
  /** Echo of the filters that were applied */
  filters?: {
    /** Position filter that was applied */
    position?: string;
    /** Team filter that was applied */
    team?: string;
    /** Search query that was applied */
    query?: string;
  };
}

/**
 * Available player information for draft selection.
 * Includes basic player data and optional intelligence for draft decisions.
 */
export interface DraftPlayer {
  /** Unique identifier for the player */
  playerId: string;
  /** Player's full name */
  fullName: string;
  /** Player's primary position */
  position?: string;
  /** Player's current NFL team */
  team?: string;
  /** Array of fantasy-eligible positions */
  fantasyPositions?: string[];
  /** Player's age in years */
  age?: number;
  /** Number of years of NFL experience */
  yearsExp?: number;
  /** Current injury status */
  injuryStatus?: string;
  /** Search popularity ranking */
  searchRank?: number;
  /** Position on team depth chart */
  depthChartOrder?: number;
  /** Specific depth chart position */
  depthChartPosition?: string;
  /** Optional intelligence data for draft analysis */
  intelligence?: {
    /** Rankings from various sources */
    rankings: Array<{
      /** Source of the ranking (ESPN, FantasyPros, etc.) */
      source: string;
      /** Position rank from this source */
      rank: number;
      /** Tier classification */
      tier?: number;
      /** Average draft position */
      adp?: number;
    }>;
    /** Recent news affecting the player */
    recentNews: Array<{
      /** News headline */
      headline: string;
      /** Expected fantasy impact */
      impact: 'positive' | 'negative' | 'neutral';
      /** When the news was published */
      publishedAt: string;
    }>;
    /** Expert recommendations */
    expertOpinions: Array<{
      /** Expert or analyst name */
      expert: string;
      /** Overall recommendation */
      recommendation: 'buy' | 'hold' | 'sell' | 'avoid';
      /** Confidence level in the recommendation */
      confidence: 'low' | 'medium' | 'high';
    }>;
    /** Draft-specific context and value assessment */
    draftContext?: {
      /** Average draft position */
      adp: number;
      /** Algorithmic recommendation score */
      recommendationScore: number;
      /** Value assessment at current draft position */
      value: 'reach' | 'fair' | 'value' | 'steal';
    };
  };
}