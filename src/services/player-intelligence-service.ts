import { 
  IPlayerIntelligenceService,
  EnhancedPlayerInfo,
  PlayerRankings,
  PlayerNews,
  InjuryReport,
  ExpertOpinion,
  PlayerIntelligence,
  PlayerIntelligenceOptions,
  PlayerProjections,
  PlayerTrends,
  DraftContext
} from '../models/player-intelligence-models.js';
import { PlayerDetails } from '../models/player-models.js';
import { IESPNIntelligenceClient } from './espn-intelligence-client.js';
import { IFantasyProClient } from './fantasypros-client.js';
import { ICacheService } from './cache-service.js';
import { ISleeperApiClient } from './sleeper-api-client.js';

/**
 * Service for aggregating comprehensive player intelligence data.
 * Combines rankings, news, injury reports, expert opinions, and draft context
 * from multiple fantasy football data sources to provide enhanced player insights.
 */
export class PlayerIntelligenceService implements IPlayerIntelligenceService {
  /**
   * Creates a new PlayerIntelligenceService instance.
   * @param espnClient - Client for ESPN fantasy intelligence data
   * @param fantasyProClient - Client for FantasyPros consensus data
   * @param sleeperClient - Client for Sleeper API basic player data
   * @param cacheService - Service for caching intelligence data
   */
  constructor(
    private espnClient: IESPNIntelligenceClient,
    private fantasyProClient: IFantasyProClient,
    private sleeperClient: ISleeperApiClient,
    private cacheService: ICacheService
  ) {}

  /**
   * Retrieves comprehensive enhanced player information with intelligence data.
   * @param playerId - Unique player identifier
   * @param options - Configuration options for data inclusion and caching
   * @returns Promise resolving to enhanced player info or null if player not found
   * @example
   * ```typescript
   * const playerInfo = await playerIntelligenceService.getEnhancedPlayerInfo("4034", {
   *   includeRankings: true,
   *   includeNews: true,
   *   includeDraftContext: true,
   *   newsLimit: 3,
   *   scoringFormat: "ppr"
   * });
   * ```
   */
  async getEnhancedPlayerInfo(playerId: string, options: PlayerIntelligenceOptions = {}): Promise<EnhancedPlayerInfo | null> {
    try {
      const cacheKey = `enhanced_player_${playerId}_${JSON.stringify(options)}`;
      
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const basicPlayer = await this.getBasicPlayerInfo(playerId);
          if (!basicPlayer) {
            return null;
          }

          const intelligence = await this.gatherPlayerIntelligence(playerId, basicPlayer, options);

          return {
            playerId,
            basicInfo: {
              fullName: basicPlayer.fullName,
              position: basicPlayer.position,
              team: basicPlayer.team,
              age: basicPlayer.age,
              yearsExp: basicPlayer.yearsExp,
              injuryStatus: basicPlayer.injuryStatus
            },
            intelligence,
            lastUpdated: new Date().toISOString()
          };
        },
        30 * 60 // 30 minutes cache
      );
    } catch (error) {
      console.warn(`Failed to get enhanced player info for ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Retrieves consensus player rankings from multiple sources.
   * @param position - Optional position filter (QB, RB, WR, TE)
   * @returns Promise resolving to aggregated player rankings
   * @example
   * ```typescript
   * const rbRankings = await playerIntelligenceService.getPlayerRankings("RB");
   * ```
   */
  async getPlayerRankings(position?: string): Promise<PlayerRankings[]> {
    const cacheKey = `player_rankings_${position || 'all'}`;
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const rankings: PlayerRankings[] = [];

        const [espnRankings, fantasyProRankings] = await Promise.allSettled([
          this.espnClient.getPlayerRankings(position),
          this.fantasyProClient.getConsensusRankings(position)
        ]);

        if (espnRankings.status === 'fulfilled') {
          rankings.push(...espnRankings.value);
        }

        if (fantasyProRankings.status === 'fulfilled') {
          rankings.push(...fantasyProRankings.value);
        }

        return rankings;
      },
      4 * 60 * 60 // 4 hours cache
    );
  }

  /**
   * Retrieves recent news and updates for a specific player.
   * @param playerId - Unique player identifier
   * @param limit - Maximum number of news items to return
   * @returns Promise resolving to sorted player news (most recent first)
   * @example
   * ```typescript
   * const news = await playerIntelligenceService.getPlayerNews("4034", 3);
   * ```
   */
  async getPlayerNews(playerId: string, limit: number = 5): Promise<PlayerNews[]> {
    const cacheKey = `player_news_${playerId}_${limit}`;
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const allNews: PlayerNews[] = [];

        const espnNews = await this.espnClient.getPlayerNews(playerId, limit);
        allNews.push(...espnNews);

        return allNews
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, limit);
      },
      60 * 60 // 1 hour cache
    );
  }

  /**
   * Retrieves injury reports for a specific player or all players.
   * @param playerId - Optional player ID to filter reports
   * @returns Promise resolving to injury reports
   * @example
   * ```typescript
   * const allInjuries = await playerIntelligenceService.getInjuryReports();
   * const playerInjuries = await playerIntelligenceService.getInjuryReports("4034");
   * ```
   */
  async getInjuryReports(playerId?: string): Promise<InjuryReport[]> {
    const cacheKey = `injury_reports_${playerId || 'all'}`;
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const espnInjuries = await this.espnClient.getInjuryReports();
        
        if (playerId) {
          return espnInjuries.filter(injury => injury.playerId === playerId);
        }
        
        return espnInjuries;
      },
      30 * 60 // 30 minutes cache
    );
  }

  /**
   * Retrieves expert opinions and analysis for a specific player.
   * @param playerId - Unique player identifier
   * @returns Promise resolving to expert opinions from fantasy analysts
   * @example
   * ```typescript
   * const opinions = await playerIntelligenceService.getExpertOpinions("4034");
   * ```
   */
  async getExpertOpinions(playerId: string): Promise<ExpertOpinion[]> {
    const cacheKey = `expert_opinions_${playerId}`;
    
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const fantasyProOpinions = await this.fantasyProClient.getExpertOpinions(playerId);
        return fantasyProOpinions;
      },
      2 * 60 * 60 // 2 hours cache
    );
  }

  /**
   * Retrieves basic player information from Sleeper API.
   * @param playerId - Unique player identifier
   * @returns Promise resolving to basic player details or null if not found
   */
  private async getBasicPlayerInfo(playerId: string): Promise<PlayerDetails | null> {
    try {
      const cacheKey = `players_nfl_${new Date().toISOString().split('T')[0]}`;
      const allPlayers = await this.cacheService.getOrSet(
        cacheKey,
        () => this.sleeperClient.getAllPlayers(),
        24 * 60 * 60 // 24 hours
      );

      const player = allPlayers[playerId];
      if (!player) {
        return null;
      }

      return {
        playerId: player.player_id,
        fullName: player.full_name || `${player.first_name} ${player.last_name}`,
        firstName: player.first_name,
        lastName: player.last_name,
        position: player.position,
        team: player.team,
        fantasyPositions: player.fantasy_positions,
        age: player.age,
        yearsExp: player.years_exp,
        status: player.status,
        injuryStatus: player.injury_status,
        number: player.number,
        depthChartOrder: player.depth_chart_order,
        depthChartPosition: player.depth_chart_position,
        searchRank: player.search_rank
      };
    } catch (error) {
      console.warn(`Failed to get basic player info for ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Aggregates intelligence data from multiple sources based on options.
   * @param playerId - Unique player identifier
   * @param basicPlayer - Basic player information
   * @param options - Configuration for data inclusion
   * @returns Promise resolving to comprehensive player intelligence
   */
  private async gatherPlayerIntelligence(
    playerId: string, 
    basicPlayer: PlayerDetails, 
    options: PlayerIntelligenceOptions
  ): Promise<PlayerIntelligence> {
    const intelligence: PlayerIntelligence = {
      rankings: [],
      projections: this.createEmptyProjections(),
      news: [],
      injuries: [],
      expertOpinions: [],
      trends: this.createEmptyTrends()
    };

    const tasks = [];

    if (options.includeRankings !== false) {
      tasks.push(
        this.getPlayerRankings(basicPlayer.position).then(rankings => {
          intelligence.rankings = rankings.filter(r => 
            r.position === basicPlayer.position
          );
        }).catch(() => {})
      );
    }

    if (options.includeNews !== false) {
      tasks.push(
        this.getPlayerNews(playerId, options.newsLimit || 5).then(news => {
          intelligence.news = news;
        }).catch(() => {})
      );
    }

    if (options.includeInjuries !== false) {
      tasks.push(
        this.getInjuryReports(playerId).then(injuries => {
          intelligence.injuries = injuries;
        }).catch(() => {})
      );
    }

    if (options.includeExpertOpinions !== false) {
      tasks.push(
        this.getExpertOpinions(playerId).then(opinions => {
          intelligence.expertOpinions = opinions;
        }).catch(() => {})
      );
    }

    if (options.includeTrends !== false) {
      tasks.push(
        this.fantasyProClient.getPlayerTrends(playerId).then(trends => {
          if (trends) {
            intelligence.trends = trends;
          }
        }).catch(() => {})
      );
    }

    if (options.includeDraftContext !== false) {
      tasks.push(
        this.generateDraftContext(playerId, basicPlayer).then(context => {
          intelligence.draftContext = context;
        }).catch(() => {})
      );
    }

    await Promise.allSettled(tasks);

    return intelligence;
  }

  /**
   * Generates draft context information including ADP, value assessment, and recommendations.
   * @param playerId - Unique player identifier
   * @param basicPlayer - Basic player information
   * @returns Promise resolving to draft context or undefined if data unavailable
   */
  private async generateDraftContext(playerId: string, basicPlayer: PlayerDetails): Promise<DraftContext | undefined> {
    try {
      const adpData = await this.fantasyProClient.getADP(basicPlayer.position);
      const playerADP = adpData.find(p => p.playerId === playerId);
      
      if (!playerADP) {
        return undefined;
      }

      const positionRankings = await this.getPlayerRankings(basicPlayer.position);
      const playerRanking = positionRankings.find(r => r.source === 'fantasypros');
      
      return {
        adp: playerADP.adp,
        recommendationScore: this.calculateRecommendationScore(basicPlayer, playerADP.adp),
        positionRank: playerRanking?.rank || 0,
        tier: playerRanking?.tier || 1,
        value: this.determineValue(playerADP.adp, playerRanking?.rank || 0),
        bestRound: Math.floor((playerADP.adp - 5) / 12) + 1,
        worstRound: Math.floor((playerADP.adp + 5) / 12) + 1
      };
    } catch (error) {
      console.warn('Failed to generate draft context:', error);
      return undefined;
    }
  }

  /**
   * Calculates a recommendation score based on player attributes and ADP.
   * @param player - Player details
   * @param adp - Average draft position
   * @returns Recommendation score (0-100, higher is better)
   */
  private calculateRecommendationScore(player: PlayerDetails, adp: number): number {
    let score = 50; // Base score

    // Age factor
    if (player.age && player.age < 25) {score += 10;}
    if (player.age && player.age > 30) {score -= 5;}

    // Experience factor
    if (player.yearsExp && player.yearsExp > 1 && player.yearsExp < 8) {score += 5;}

    // Injury status
    if (player.injuryStatus === 'Healthy') {score += 10;}
    if (player.injuryStatus === 'Out') {score -= 20;}

    // ADP factor (lower ADP = higher demand = higher score)
    if (adp < 24) {score += 15;} // First 2 rounds
    if (adp > 120) {score -= 10;} // Late rounds

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determines draft value assessment based on ADP vs position ranking.
   * @param adp - Average draft position
   * @param positionRank - Position-based ranking
   * @returns Value assessment classification
   */
  private determineValue(adp: number, positionRank: number): 'reach' | 'fair' | 'value' | 'steal' {
    const expectedADP = positionRank * 3; // Rough estimate
    const difference = adp - expectedADP;

    if (difference > 20) {return 'reach';}
    if (difference > 5) {return 'fair';}
    if (difference < -10) {return 'steal';}
    return 'value';
  }

  /**
   * Creates empty projection structure for players without projection data.
   * @returns Empty player projections object
   */
  private createEmptyProjections(): PlayerProjections {
    return {
      source: 'none',
      scoringFormat: 'ppr',
      weeklyProjection: false,
      seasonProjection: false
    };
  }

  /**
   * Creates empty trends structure for players without trend data.
   * @returns Empty player trends object
   */
  private createEmptyTrends(): PlayerTrends {
    return {
      adpTrend: {
        direction: 'stable',
        change: 0,
        timeframe: '7d'
      },
      ownershipTrend: {
        percentOwned: 0,
        change: 0,
        timeframe: '7d'
      },
      searchTrend: {
        volume: 'medium',
        change: 0
      }
    };
  }
}