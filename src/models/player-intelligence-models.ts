/**
 * @fileoverview Player intelligence aggregation models for enhanced fantasy football analysis.
 * Contains models for rankings, projections, news analysis, injury tracking, and expert opinions.
 */

/**
 * Service interface for player intelligence and analysis operations.
 * Aggregates data from multiple sources to provide comprehensive player insights.
 */
export interface IPlayerIntelligenceService {
  /**
   * Retrieves comprehensive enhanced information for a player.
   * @param playerId - Unique identifier for the player
   * @param options - Configuration for which intelligence data to include
   * @returns Promise resolving to enhanced player info or null if not found
   */
  getEnhancedPlayerInfo(playerId: string, options?: PlayerIntelligenceOptions): Promise<EnhancedPlayerInfo | null>;
  
  /**
   * Retrieves current rankings for players by position.
   * @param position - Optional position filter (returns all positions if omitted)
   * @returns Promise resolving to array of player rankings
   */
  getPlayerRankings(position?: string): Promise<PlayerRankings[]>;
  
  /**
   * Retrieves recent news for a specific player.
   * @param playerId - Unique identifier for the player
   * @param limit - Maximum number of news items to return
   * @returns Promise resolving to array of player news items
   */
  getPlayerNews(playerId: string, limit?: number): Promise<PlayerNews[]>;
  
  /**
   * Retrieves injury reports for a player or all current injuries.
   * @param playerId - Optional player ID (returns all injury reports if omitted)
   * @returns Promise resolving to array of injury reports
   */
  getInjuryReports(playerId?: string): Promise<InjuryReport[]>;
  
  /**
   * Retrieves expert opinions and analysis for a player.
   * @param playerId - Unique identifier for the player
   * @returns Promise resolving to array of expert opinions
   */
  getExpertOpinions(playerId: string): Promise<ExpertOpinion[]>;
}

/**
 * Comprehensive player information with intelligence data.
 * Combines basic player info with advanced analytics and insights.
 */
export interface EnhancedPlayerInfo {
  /** Unique identifier for the player */
  playerId: string;
  /** Basic biographical and team information */
  basicInfo: {
    /** Player's full name */
    fullName: string;
    /** Primary playing position */
    position?: string;
    /** Current NFL team */
    team?: string;
    /** Player's age in years */
    age?: number;
    /** Years of NFL experience */
    yearsExp?: number;
    /** Current injury status */
    injuryStatus?: string;
  };
  /** Advanced intelligence and analytics data */
  intelligence: PlayerIntelligence;
  /** ISO timestamp when this data was last updated */
  lastUpdated: string;
}

/**
 * Aggregated intelligence data for a player.
 * Contains all available analytical insights and predictions.
 */
export interface PlayerIntelligence {
  /** Rankings from various sources and formats */
  rankings: PlayerRankings[];
  /** Statistical projections for upcoming games/season */
  projections: PlayerProjections;
  /** Recent news items affecting the player */
  news: PlayerNews[];
  /** Current and recent injury information */
  injuries: InjuryReport[];
  /** Expert analysis and recommendations */
  expertOpinions: ExpertOpinion[];
  /** Trending data and popularity metrics */
  trends: PlayerTrends;
  /** Draft-specific analysis and recommendations */
  draftContext?: DraftContext;
}

/**
 * Player ranking information from a specific source.
 * Contains positional ranking and draft position data.
 */
export interface PlayerRankings {
  /** Source of the ranking data */
  source: 'espn' | 'fantasypros' | 'sleeper' | 'consensus';
  /** Position being ranked (QB, RB, WR, TE, K, DEF) */
  position: string;
  /** Positional rank (1 = best at position) */
  rank: number;
  /** Tier classification for grouping similar players */
  tier?: number;
  /** Average draft position across drafts */
  adp?: number;
  /** Scoring format this ranking applies to */
  scoringFormat: 'standard' | 'ppr' | 'half-ppr';
  /** ISO timestamp when ranking was last updated */
  lastUpdated: string;
}

/**
 * Statistical projections for a player.
 * Forecasts performance in various statistical categories.
 */
export interface PlayerProjections {
  /** Source of the projection data */
  source: string;
  /** Projected passing yards */
  passingYards?: number;
  /** Projected passing touchdowns */
  passingTds?: number;
  /** Projected rushing yards */
  rushingYards?: number;
  /** Projected rushing touchdowns */
  rushingTds?: number;
  /** Projected receiving yards */
  receivingYards?: number;
  /** Projected receiving touchdowns */
  receivingTds?: number;
  /** Projected receptions */
  receptions?: number;
  /** Projected total fantasy points */
  fantasyPoints?: number;
  /** Scoring format these projections are based on */
  scoringFormat: 'standard' | 'ppr' | 'half-ppr';
  /** Whether this is a weekly projection */
  weeklyProjection?: boolean;
  /** Whether this is a season-long projection */
  seasonProjection?: boolean;
}

/**
 * News item affecting a player's fantasy value.
 * Analyzed for fantasy football relevance and impact.
 */
export interface PlayerNews {
  /** News headline/title */
  headline: string;
  /** Brief summary of the news content */
  summary: string;
  /** Source publication or reporter */
  source: string;
  /** Expected impact on fantasy performance */
  impact: 'positive' | 'negative' | 'neutral';
  /** Severity/magnitude of the impact */
  severity: 'low' | 'medium' | 'high';
  /** ISO timestamp when news was published */
  publishedAt: string;
  /** URL to the full news article */
  url?: string;
  /** Categorization tags for the news */
  tags?: string[];
}

/**
 * Detailed injury report for a player.
 * Tracks injury status, timeline, and fantasy implications.
 */
export interface InjuryReport {
  /** Player this injury report refers to */
  playerId: string;
  /** Type/nature of the injury */
  injuryType: string;
  /** Body part affected by the injury */
  bodyPart: string;
  /** Current official injury status */
  status: 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'pup';
  /** Expected return date if available */
  expectedReturn?: string;
  /** Detailed description of the injury */
  description: string;
  /** Source of the injury report */
  source: string;
  /** ISO timestamp when injury was first reported */
  reportedAt: string;
  /** ISO timestamp when report was last updated */
  lastUpdated: string;
}

/**
 * Expert analysis and recommendation for a player.
 * Professional opinions from fantasy analysts and experts.
 */
export interface ExpertOpinion {
  /** Name of the expert or analyst */
  expert: string;
  /** Publication or platform the expert represents */
  source: string;
  /** Full text of the expert's opinion */
  opinion: string;
  /** Overall recommendation for fantasy purposes */
  recommendation: 'buy' | 'hold' | 'sell' | 'avoid';
  /** Expert's confidence level in their recommendation */
  confidence: 'low' | 'medium' | 'high';
  /** Reasoning behind the recommendation */
  reasoning: string;
  /** ISO timestamp when opinion was published */
  publishedAt: string;
}

/**
 * Trending data and popularity metrics for a player.
 * Tracks changes in draft position, ownership, and search volume.
 */
export interface PlayerTrends {
  /** Average draft position trending data */
  adpTrend: {
    /** Direction of ADP movement */
    direction: 'rising' | 'falling' | 'stable';
    /** Numerical change in ADP */
    change: number;
    /** Time period for the trend analysis */
    timeframe: '24h' | '7d' | '30d';
  };
  /** Ownership percentage trending data */
  ownershipTrend: {
    /** Current percentage of leagues where player is owned */
    percentOwned: number;
    /** Change in ownership percentage */
    change: number;
    /** Time period for the trend analysis */
    timeframe: '24h' | '7d';
  };
  /** Search volume trending data */
  searchTrend: {
    /** Current search volume level */
    volume: 'low' | 'medium' | 'high' | 'trending';
    /** Change in search volume */
    change: number;
  };
}

/**
 * Draft-specific analysis and recommendations.
 * Provides context for draft decision making.
 */
export interface DraftContext {
  /** Current average draft position */
  adp: number;
  /** Algorithmic recommendation score (0-100) */
  recommendationScore: number;
  /** Rank among players at the same position */
  positionRank: number;
  /** Tier classification for draft purposes */
  tier: number;
  /** Value assessment at current draft position */
  value: 'reach' | 'fair' | 'value' | 'steal';
  /** Earliest recommended round to draft this player */
  bestRound?: number;
  /** Latest recommended round to draft this player */
  worstRound?: number;
}

/**
 * Configuration options for player intelligence queries.
 * Controls which types of intelligence data to include and retrieve.
 */
export interface PlayerIntelligenceOptions {
  /** Whether to include ranking data */
  includeRankings?: boolean;
  /** Whether to include statistical projections */
  includeProjections?: boolean;
  /** Whether to include recent news */
  includeNews?: boolean;
  /** Whether to include injury reports */
  includeInjuries?: boolean;
  /** Whether to include expert opinions */
  includeExpertOpinions?: boolean;
  /** Whether to include trending data */
  includeTrends?: boolean;
  /** Whether to include draft context analysis */
  includeDraftContext?: boolean;
  /** Maximum number of news items to return */
  newsLimit?: number;
  /** Scoring format for rankings and projections */
  scoringFormat?: 'standard' | 'ppr' | 'half-ppr';
}

/**
 * ESPN API response structure for player data.
 * Raw response format from ESPN's player API endpoints.
 */
export interface ESPNPlayerResponse {
  /** ESPN's unique player identifier */
  id: string;
  /** Player's full name */
  fullName: string;
  /** ESPN's position ID mapping */
  defaultPositionId: number;
  /** ESPN's team ID mapping */
  proTeamId: number;
  /** Raw statistics data from ESPN */
  stats?: any[];
  /** Whether player is currently injured */
  injured?: boolean;
  /** ESPN's injury status designation */
  injuryStatus?: string;
}

/**
 * ESPN API response structure for news data.
 * Raw response format from ESPN's news API endpoints.
 */
export interface ESPNNewsResponse {
  /** Array of news headlines from ESPN */
  headlines: Array<{
    /** News article headline */
    headline: string;
    /** Article description or summary */
    description: string;
    /** Publication timestamp */
    published: string;
    /** News source attribution */
    source: string;
    /** Type of news content */
    type: string;
  }>;
}

/**
 * FantasyPros API response structure for rankings data.
 * Raw response format from FantasyPros ranking API endpoints.
 */
export interface FantasyProResponse {
  /** Array of player ranking data from FantasyPros */
  players: Array<{
    /** Player's name as stored in FantasyPros */
    player_name: string;
    /** FantasyPros player identifier */
    player_id: string;
    /** Position-based ranking */
    pos_rank: number;
    /** Tier classification */
    tier: number;
    /** Average draft position */
    adp: number;
  }>;
}