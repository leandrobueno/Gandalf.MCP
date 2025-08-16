/**
 * @fileoverview Roster management models and service interfaces for fantasy football leagues.
 * Contains models for roster summaries, detailed roster views, owner information, and player assignments.
 */

/**
 * Service interface for roster management operations.
 * Provides methods to retrieve roster information and team details.
 */
export interface IRosterService {
  /**
   * Retrieves all rosters in a league with summary information.
   * @param leagueId - Unique identifier for the league
   * @returns Promise resolving to complete roster listing with league info
   */
  getAllRosters(leagueId: string): Promise<AllRostersResult>;
  
  /**
   * Retrieves detailed information for a specific roster.
   * @param leagueId - Unique identifier for the league
   * @param rosterIdOrUsername - Either roster ID number or owner's username
   * @returns Promise resolving to detailed roster info or null if not found
   */
  getRoster(leagueId: string, rosterIdOrUsername: string): Promise<RosterDetails | null>;
}

/**
 * Result containing all rosters in a league with summary information.
 * Returned by getAllRosters service method.
 */
export interface AllRostersResult {
  /** Basic information about the league */
  league: LeagueInfo;
  /** Total number of rosters/teams in the league */
  totalRosters: number;
  /** Array of roster summaries for all teams */
  rosters: RosterSummary[];
}

/**
 * Basic league information included in roster results.
 * Provides context about the league containing the rosters.
 */
export interface LeagueInfo {
  /** Unique identifier for the league */
  leagueId: string;
  /** Human-readable name of the league */
  name: string;
  /** Season year (e.g., "2024") */
  season: string;
  /** Total number of teams in the league */
  totalRosters: number;
}

/**
 * Summary view of a roster with key performance metrics.
 * Used in roster listings and league overviews.
 */
export interface RosterSummary {
  /** Unique identifier for the roster within the league */
  rosterId: number;
  /** User ID of the roster owner (null for orphaned teams) */
  ownerId?: string;
  /** Owner's username/handle */
  ownerUsername?: string;
  /** Owner's display name */
  ownerDisplayName?: string;
  /** Total wins for the season */
  wins: number;
  /** Total losses for the season */
  losses: number;
  /** Total ties for the season */
  ties: number;
  /** Total fantasy points scored this season */
  totalPoints: number;
  /** Total fantasy points scored against this roster */
  pointsAgainst: number;
  /** Total number of players on the roster */
  playerCount: number;
  /** Number of players in starting lineup */
  starterCount: number;
}

/**
 * Detailed view of a roster including all players and owner information.
 * Returned by getRoster service method for complete roster analysis.
 */
export interface RosterDetails {
  /** Unique identifier for the roster */
  rosterId: number;
  /** Detailed information about the roster owner */
  owner?: OwnerDetails;
  /** Season performance record */
  record: RosterRecord;
  /** Players currently in starting lineup */
  starters: PlayerInfo[];
  /** Players on the bench */
  bench: PlayerInfo[];
  /** Players on injured reserve */
  reserve: PlayerInfo[];
  /** Players on taxi squad (dynasty leagues) */
  taxi: PlayerInfo[];
}

/**
 * Detailed information about a roster owner.
 * Includes profile information and avatar data.
 */
export interface OwnerDetails {
  /** Unique user identifier */
  userId: string;
  /** User's chosen username/handle */
  username: string;
  /** User's display name (may differ from username) */
  displayName?: string;
  /** Avatar identifier for profile picture */
  avatar?: string;
}

/**
 * Season performance record for a roster.
 * Tracks wins/losses and fantasy point totals.
 */
export interface RosterRecord {
  /** Total wins for the season */
  wins: number;
  /** Total losses for the season */
  losses: number;
  /** Total ties for the season */
  ties: number;
  /** Total fantasy points scored */
  totalPoints: number;
  /** Total fantasy points allowed/scored against */
  pointsAgainst: number;
}

/**
 * Basic player information for roster display.
 * Contains essential player details for roster management.
 */
export interface PlayerInfo {
  /** Unique identifier for the player */
  playerId: string;
  /** Player's full name */
  fullName: string;
  /** Player's primary position (QB, RB, WR, TE, K, DEF) */
  position?: string;
  /** Player's current NFL team abbreviation */
  team?: string;
  /** Current injury status (Healthy, Questionable, Doubtful, Out, IR) */
  injuryStatus?: string;
}