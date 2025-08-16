/**
 * @fileoverview League management and matchup models for fantasy football league operations.
 * Contains models for league details, user leagues, weekly matchups, and transaction tracking.
 */

/**
 * Service interface for league management operations.
 * Provides methods to retrieve league information, matchups, and transactions.
 */
export interface ILeagueService {
  /**
   * Retrieves all leagues for a specific user.
   * @param username - Sleeper username to look up leagues for
   * @param season - Optional season filter (defaults to current season)
   * @returns Promise resolving to user's leagues for the specified season
   */
  getUserLeagues(username: string, season?: string): Promise<UserLeaguesResult>;
  
  /**
   * Retrieves detailed information about a specific league.
   * @param leagueId - Unique identifier for the league
   * @returns Promise resolving to league details or null if not found
   */
  getLeagueDetails(leagueId: string): Promise<LeagueDetails | null>;
  
  /**
   * Retrieves matchup information for a specific week.
   * @param leagueId - Unique identifier for the league
   * @param week - Optional week number (defaults to current week)
   * @param includePlayerDetails - Whether to include detailed player information
   * @param includeRosterDetails - Whether to include roster owner information
   * @returns Promise resolving to matchup data with optional enhanced details
   */
  getMatchups(leagueId: string, week?: number, includePlayerDetails?: boolean, includeRosterDetails?: boolean): Promise<MatchupsResult>;
  
  /**
   * Retrieves transaction history for a league.
   * @param leagueId - Unique identifier for the league
   * @param week - Optional week filter (returns all transactions if omitted)
   * @returns Promise resolving to transaction history
   */
  getLeagueTransactions(leagueId: string, week?: number): Promise<TransactionsResult>;
}

/**
 * Result containing all leagues for a specific user.
 * Returned by getUserLeagues service method.
 */
export interface UserLeaguesResult {
  /** Summary information about the user */
  user: UserSummary;
  /** Season year these leagues are from */
  season: string;
  /** Total number of leagues found for the user */
  totalLeagues: number;
  /** Array of league summaries for the user */
  leagues: LeagueSummary[];
}

/**
 * Summary information about a user.
 * Basic user identification for league context.
 */
export interface UserSummary {
  /** Unique user identifier */
  userId: string;
  /** User's username/handle */
  username: string;
  /** User's display name */
  displayName?: string;
}

/**
 * Summary view of a league for user league listings.
 * Contains key league information without full details.
 */
export interface LeagueSummary {
  /** Unique identifier for the league */
  leagueId: string;
  /** Human-readable name of the league */
  name: string;
  /** Season year */
  season: string;
  /** Current league status (pre_draft, drafting, in_season, complete) */
  status: string;
  /** Number of teams in the league */
  totalRosters: number;
  /** Type of scoring system (standard, ppr, half-ppr) */
  scoringType: string;
  /** Current draft status (not_started, in_progress, complete) */
  draftStatus: string;
}

/**
 * Detailed league information with complete configuration.
 * Comprehensive view of league settings and rules.
 */
export interface LeagueDetails {
  /** Unique identifier for the league */
  leagueId: string;
  /** Human-readable name of the league */
  name: string;
  /** Season year */
  season: string;
  /** Type of season (regular, post, off) */
  seasonType: string;
  /** Current league status */
  status: string;
  /** Total number of teams/rosters */
  totalRosters: number;
  /** Sport type (typically "nfl") */
  sport: string;
  /** Required roster position slots */
  rosterPositions?: string[];
  /** Detailed scoring configuration with point values */
  scoringSettings?: Record<string, number>;
  /** Additional league settings and rules */
  settings?: any;
  /** Summary of scoring type for quick reference */
  scoringType: string;
}

/**
 * Result containing all matchups for a specific week.
 * Shows head-to-head competitions between teams.
 */
export interface MatchupsResult {
  /** League these matchups belong to */
  leagueId: string;
  /** Week number for these matchups */
  week: number;
  /** Total number of matchups for this week */
  totalMatchups: number;
  /** Array of individual matchup details */
  matchups: MatchupDetails[];
}

/**
 * Details of a single head-to-head matchup.
 * Contains information for both competing teams.
 */
export interface MatchupDetails {
  /** Unique identifier linking the competing teams */
  matchupId: number;
  /** Array of teams in this matchup (typically 2 teams) */
  teams: TeamMatchup[];
}

/**
 * Individual team's performance in a matchup.
 * Contains scoring data and optional player details.
 */
export interface TeamMatchup {
  /** Roster ID of this team */
  rosterId: number;
  /** Total fantasy points scored by this team */
  points: number;
  /** Array of player IDs in starting lineup */
  starters?: string[];
  /** Array of all player IDs on the roster */
  players?: string[];
  /** Map of player ID to fantasy points scored */
  playersPoints?: Record<string, number>;
  /** Detailed information for starting players */
  starterDetails?: PlayerMatchupInfo[];
  /** Detailed information for all players */
  playerDetails?: PlayerMatchupInfo[];
}

/**
 * Player performance information within a matchup.
 * Shows individual player contributions to team scoring.
 */
export interface PlayerMatchupInfo {
  /** Unique identifier for the player */
  playerId: string;
  /** Player's full name */
  name: string;
  /** Player's position */
  position?: string;
  /** Player's NFL team */
  team?: string;
  /** Fantasy points scored by this player */
  points: number;
  /** Whether this player was in the starting lineup */
  isStarter: boolean;
}

/**
 * Result containing transaction history for a league.
 * Shows all roster moves and player transactions.
 */
export interface TransactionsResult {
  /** League these transactions belong to */
  leagueId: string;
  /** Week filter that was applied (0 = all weeks) */
  week: number;
  /** Total number of transactions found */
  totalTransactions: number;
  /** Array of transaction details */
  transactions: TransactionDetails[];
}

/**
 * Details of a specific roster transaction.
 * Tracks player movements and roster changes.
 */
export interface TransactionDetails {
  /** Unique identifier for the transaction */
  transactionId: string;
  /** Type of transaction (free_agent, trade, waiver) */
  type: string;
  /** Current status (complete, pending, failed) */
  status: string;
  /** Week when transaction occurred */
  week: number;
  /** Array of roster IDs involved in the transaction */
  rosterIds?: number[];
  /** Map of player ID to receiving roster ID for additions */
  adds?: Record<string, number>;
  /** Map of player ID to dropping roster ID for releases */
  drops?: Record<string, number>;
  /** ISO timestamp when transaction was created */
  created: string;
}