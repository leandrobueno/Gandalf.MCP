/**
 * @fileoverview Lean Data Transfer Objects (DTOs) for optimized API responses.
 * Provides minimal, focused data structures that reduce token usage while maintaining essential information.
 */

import { ResponseProfile } from './response-models.js';

/**
 * Base interface for all DTOs with common identification fields.
 * Provides consistent structure across different entity types.
 */
export interface BaseDTO {
  /** Unique identifier for the entity */
  id: string;
  /** Human-readable name or title */
  name: string;
}

// ============================================================================
// PLAYER DTOs
// ============================================================================

/**
 * Minimal player DTO containing only essential identification fields.
 * Perfect for lists, searches, and token-efficient operations.
 * ~60% smaller than full PlayerDetails interface.
 */
export interface PlayerMinimalDTO extends BaseDTO {
  /** Player's unique ID */
  id: string;
  /** Player's full name */
  name: string;
  /** Primary position (QB, RB, WR, TE, K, DEF) */
  pos: string;
  /** Current NFL team abbreviation */
  team: string;
}

/**
 * Standard player DTO with balanced information for most use cases.
 * Includes key fantasy-relevant fields while remaining compact.
 * ~40% smaller than full PlayerDetails interface.
 */
export interface PlayerStandardDTO extends PlayerMinimalDTO {
  /** Player's age in years */
  age?: number;
  /** Years of NFL experience */
  exp?: number;
  /** Current injury status */
  injury?: string;
  /** Fantasy relevance ranking */
  rank?: number;
  /** Jersey number */
  number?: number;
}

/**
 * Trending player DTO optimized for add/drop activity display.
 * Focused on trending-specific information with minimal overhead.
 */
export interface TrendingPlayerDTO {
  /** Player's full name */
  name: string;
  /** Primary position */
  pos: string;
  /** Current team */
  team: string;
  /** Number of add/drop transactions */
  count: number;
  /** Type of trending activity */
  trend?: 'add' | 'drop';
  /** Current injury status affecting trending */
  injury?: string;
}

// ============================================================================
// LEAGUE DTOs
// ============================================================================

/**
 * Minimal league DTO for league listings and references.
 * Contains only essential league identification.
 */
export interface LeagueMinimalDTO extends BaseDTO {
  /** League unique ID */
  id: string;
  /** League name */
  name: string;
  /** Number of teams */
  teams: number;
  /** League status (active, complete, etc.) */
  status: string;
}

/**
 * Standard league DTO with key configuration details.
 * Suitable for league selection and management interfaces.
 */
export interface LeagueStandardDTO extends LeagueMinimalDTO {
  /** Season year */
  season: string;
  /** Scoring format (standard, ppr, half-ppr) */
  scoring: string;
  /** Draft status */
  draftStatus: string;
}

/**
 * User's league summary DTO for multi-league displays.
 * Optimized for showing a user's league portfolio.
 */
export interface UserLeagueDTO {
  /** League ID */
  id: string;
  /** League name */
  name: string;
  /** Number of teams */
  teams: number;
  /** League status */
  status: string;
  /** User's team record (if available) */
  record?: string;
}

// ============================================================================
// ROSTER DTOs
// ============================================================================

/**
 * Minimal roster DTO for standings and quick overviews.
 * Contains only essential team performance data.
 */
export interface RosterMinimalDTO {
  /** Roster ID */
  id: number;
  /** Owner's display name */
  owner: string;
  /** Win-loss record */
  record: string;
  /** Total points scored */
  points: number;
}

/**
 * Standard roster DTO with additional team details.
 * Includes lineup information and expanded statistics.
 */
export interface RosterStandardDTO extends RosterMinimalDTO {
  /** Points scored against */
  pointsAgainst: number;
  /** Number of active players */
  playerCount: number;
  /** League standing/rank */
  rank?: number;
}

/**
 * Player info DTO for roster displays.
 * Streamlined player representation within roster context.
 */
export interface RosterPlayerDTO {
  /** Player ID */
  id: string;
  /** Player name */
  name: string;
  /** Position */
  pos: string;
  /** Team */
  team: string;
  /** Injury status */
  injury?: string;
  /** Whether player is in starting lineup */
  starter?: boolean;
}

/**
 * Minimal player reference for use in matchups and other contexts.
 * Ultra-lightweight representation for token efficiency.
 */
export interface PlayerReferenceDTO {
  /** Player ID for full lookups */
  id: string;
  /** Player name */
  name: string;
  /** Position abbreviation */
  pos: string;
}

// ============================================================================
// MATCHUP DTOs
// ============================================================================

/**
 * Minimal matchup DTO for weekly overview displays.
 * Contains only essential scoring information.
 */
export interface MatchupMinimalDTO {
  /** Matchup identifier */
  id: number;
  /** Teams in this matchup with basic info */
  teams: TeamMatchupMinimalDTO[];
}

/**
 * Minimal team matchup information.
 * Just the essentials for matchup displays.
 */
export interface TeamMatchupMinimalDTO {
  /** Roster ID */
  rosterId: number;
  /** Owner name */
  owner: string;
  /** Points scored */
  points: number;
}

/**
 * Standard team matchup with lineup information.
 * Includes starting lineup details for more comprehensive view.
 */
export interface TeamMatchupStandardDTO extends TeamMatchupMinimalDTO {
  /** Starting lineup player count */
  starterCount: number;
  /** Top scoring players (names only) */
  topScorers?: string[];
}

// ============================================================================
// DTO TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Utility class for transforming full models into optimized DTOs.
 * Provides consistent transformation logic across different entity types.
 */
export class DTOTransformer {
  /**
   * Transforms a full player model into the appropriate DTO based on response profile.
   * @param player - Full player model
   * @param profile - Target response profile
   * @returns Appropriate player DTO
   */
  static transformPlayer(player: any, profile: ResponseProfile): PlayerMinimalDTO | PlayerStandardDTO {
    const minimal: PlayerMinimalDTO = {
      id: player.playerId,
      name: player.fullName,
      pos: player.position || 'N/A',
      team: player.team || 'FA'
    };

    if (profile === ResponseProfile.MINIMAL) {
      return minimal;
    }

    // Standard or detailed profile
    const standard: PlayerStandardDTO = {
      ...minimal,
      age: player.age,
      exp: player.yearsExp,
      injury: player.injuryStatus,
      rank: player.searchRank,
      number: player.number
    };

    return standard;
  }

  /**
   * Transforms trending player data into optimized DTO.
   * @param player - Trending player data
   * @param trend - Trend type (add/drop)
   * @param includeDetails - Whether to include additional details
   * @returns Trending player DTO
   */
  static transformTrendingPlayer(player: any, trend: 'add' | 'drop', includeDetails: boolean = false): TrendingPlayerDTO {
    const dto: TrendingPlayerDTO = {
      name: player.fullName || 'Unknown Player',
      pos: player.position || 'N/A',
      team: player.team || 'FA',
      count: player.count || 0
    };

    if (includeDetails) {
      dto.trend = trend;
      dto.injury = player.injuryStatus;
    }

    return dto;
  }

  /**
   * Transforms a full league model into the appropriate DTO.
   * @param league - Full league model
   * @param profile - Target response profile
   * @returns Appropriate league DTO
   */
  static transformLeague(league: any, profile: ResponseProfile): LeagueMinimalDTO | LeagueStandardDTO {
    const minimal: LeagueMinimalDTO = {
      id: league.leagueId,
      name: league.name,
      teams: league.totalRosters,
      status: league.status
    };

    if (profile === ResponseProfile.MINIMAL) {
      return minimal;
    }

    const standard: LeagueStandardDTO = {
      ...minimal,
      season: league.season,
      scoring: league.scoringType,
      draftStatus: league.draftStatus || 'unknown'
    };

    return standard;
  }

  /**
   * Transforms roster data into optimized DTO.
   * @param roster - Full roster model
   * @param profile - Target response profile
   * @returns Appropriate roster DTO
   */
  static transformRoster(roster: any, profile: ResponseProfile): RosterMinimalDTO | RosterStandardDTO {
    const ownerName = roster.owner?.displayName || roster.owner?.username || `Team ${roster.rosterId}`;
    const recordStr = `${roster.record?.wins || 0}-${roster.record?.losses || 0}`;

    const minimal: RosterMinimalDTO = {
      id: roster.rosterId,
      owner: ownerName,
      record: recordStr,
      points: roster.record?.totalPoints || 0
    };

    if (profile === ResponseProfile.MINIMAL) {
      return minimal;
    }

    const standard: RosterStandardDTO = {
      ...minimal,
      pointsAgainst: roster.record?.pointsAgainst || 0,
      playerCount: roster.playerCount || 0,
      rank: roster.rank
    };

    return standard;
  }

  /**
   * Creates a batch transformation function for arrays of entities.
   * @param transformer - Single entity transformer function
   * @returns Batch transformer function
   */
  static createBatchTransformer<T, U>(transformer: (item: T, ...args: any[]) => U) {
    return (items: T[], ...args: any[]): U[] => {
      return items.map(item => transformer(item, ...args));
    };
  }

  /**
   * Gets field list based on response profile for service layer optimization.
   * @param profile - Response profile level
   * @returns Array of field names to fetch from service
   */
  static getPlayerFieldsForProfile(profile: ResponseProfile): (keyof any)[] {
    const minimal = ['playerId', 'fullName', 'position', 'team'];
    const standard = [...minimal, 'age', 'yearsExp', 'injuryStatus', 'searchRank', 'number'];
    
    switch (profile) {
      case ResponseProfile.MINIMAL:
        return minimal;
      case ResponseProfile.STANDARD:
        return standard;
      case ResponseProfile.DETAILED:
        return []; // Empty array means fetch all fields
    }
  }

  /**
   * Gets trending player field list based on profile.
   * @param profile - Response profile level
   * @returns Array of field names for trending players
   */
  static getTrendingFieldsForProfile(profile: ResponseProfile): (keyof any)[] {
    const minimal = ['playerId', 'fullName', 'position', 'team', 'count'];
    const standard = [...minimal, 'injuryStatus'];
    
    switch (profile) {
      case ResponseProfile.MINIMAL:
        return minimal;
      case ResponseProfile.STANDARD:
        return standard;
      case ResponseProfile.DETAILED:
        return [];
    }
  }

  /**
   * Gets field list for league data based on response profile.
   * @param profile - Response profile level
   * @returns Array of field names for league data
   */
  static getLeagueFieldsForProfile(profile: ResponseProfile): string[] {
    const minimal = ['leagueId', 'name', 'totalRosters', 'status'];
    const standard = [...minimal, 'season', 'scoringType', 'draftStatus'];
    
    switch (profile) {
      case ResponseProfile.MINIMAL:
        return minimal;
      case ResponseProfile.STANDARD:
        return standard;
      case ResponseProfile.DETAILED:
        return [];
    }
  }

  /**
   * Gets field list for roster data based on response profile.
   * @param profile - Response profile level
   * @returns Array of field names for roster data
   */
  static getRosterFieldsForProfile(profile: ResponseProfile): string[] {
    const minimal = ['rosterId', 'owner', 'record', 'totalPoints'];
    const standard = [...minimal, 'pointsAgainst', 'playerCount', 'rank'];
    
    switch (profile) {
      case ResponseProfile.MINIMAL:
        return minimal;
      case ResponseProfile.STANDARD:
        return standard;
      case ResponseProfile.DETAILED:
        return [];
    }
  }

  /**
   * Transforms a full player object into a minimal reference for use in lists.
   * Reduces token usage by 80%+ compared to full player objects.
   * @param player - Full player object
   * @returns Minimal player reference
   */
  static transformPlayerReference(player: any): PlayerReferenceDTO {
    return {
      id: player.playerId || player.id,
      name: player.fullName || player.name,
      pos: player.position || player.pos || 'N/A'
    };
  }

  /**
   * Transforms roster player with context-aware information.
   * @param player - Full player object
   * @param isStarter - Whether player is in starting lineup
   * @param includeTeam - Whether to include team information
   * @returns Roster-optimized player DTO
   */
  static transformRosterPlayer(player: any, isStarter?: boolean, includeTeam: boolean = true): RosterPlayerDTO {
    const dto: RosterPlayerDTO = {
      id: player.playerId || player.id,
      name: player.fullName || player.name,
      pos: player.position || player.pos || 'N/A',
      team: includeTeam ? (player.team || 'FA') : 'N/A'
    };

    if (player.injuryStatus) {
      dto.injury = player.injuryStatus;
    }

    if (isStarter !== undefined) {
      dto.starter = isStarter;
    }

    return dto;
  }

  /**
   * Creates optimized player arrays for matchup contexts.
   * Converts array of full player objects to minimal references.
   * @param players - Array of full player objects
   * @param maxPlayers - Maximum number of players to include (top performers)
   * @returns Array of player references
   */
  static createPlayerReferenceList(players: any[], maxPlayers: number = 5): PlayerReferenceDTO[] {
    return players
      .slice(0, maxPlayers)
      .map(player => this.transformPlayerReference(player));
  }

  /**
   * Optimizes batch player operations by deduplicating IDs and tracking usage.
   * Helps services avoid redundant API calls and cache lookups.
   * @param playerCollections - Multiple arrays containing player IDs or objects
   * @returns Optimization data for batch operations
   */
  static optimizeBatchPlayerLookup(playerCollections: any[][]): {
    uniqueIds: string[];
    idMapping: Map<string, number>;
    totalPlayers: number;
    duplicateCount: number;
  } {
    const idSet = new Set<string>();
    const idMapping = new Map<string, number>();
    let totalPlayers = 0;

    for (const collection of playerCollections) {
      for (const player of collection) {
        const id = player.playerId || player.id || player;
        if (typeof id === 'string') {
          totalPlayers++;
          idSet.add(id);
          idMapping.set(id, (idMapping.get(id) || 0) + 1);
        }
      }
    }

    return {
      uniqueIds: Array.from(idSet),
      idMapping,
      totalPlayers,
      duplicateCount: totalPlayers - idSet.size
    };
  }

  /**
   * Creates a memory-efficient cache key for partial player data.
   * Uses field list and profile to generate consistent cache keys.
   * @param playerId - Player identifier
   * @param profile - Response profile level
   * @param additionalFields - Any additional fields requested
   * @returns Cache key string
   */
  static createPlayerCacheKey(playerId: string, profile: ResponseProfile, additionalFields: string[] = []): string {
    const profileFields = this.getPlayerFieldsForProfile(profile);
    const allFields = [...profileFields, ...additionalFields].sort();
    return `player:${playerId}:${profile}:${allFields.join(',')}`;
  }

  /**
   * Determines if a cached player object contains all required fields.
   * Prevents unnecessary API calls when cache has sufficient data.
   * @param cachedPlayer - Player object from cache
   * @param requiredFields - Fields needed for current request
   * @returns Whether cached data is sufficient
   */
  static isCacheDataSufficient(cachedPlayer: any, requiredFields: string[]): boolean {
    if (!cachedPlayer) {
      return false;
    }
    
    return requiredFields.every(field => 
      cachedPlayer[field] !== undefined && cachedPlayer[field] !== null
    );
  }
}