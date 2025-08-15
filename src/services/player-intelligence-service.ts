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

export class PlayerIntelligenceService implements IPlayerIntelligenceService {
  constructor(
    private espnClient: IESPNIntelligenceClient,
    private fantasyProClient: IFantasyProClient,
    private sleeperClient: ISleeperApiClient,
    private cacheService: ICacheService
  ) {}

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

  private determineValue(adp: number, positionRank: number): 'reach' | 'fair' | 'value' | 'steal' {
    const expectedADP = positionRank * 3; // Rough estimate
    const difference = adp - expectedADP;

    if (difference > 20) {return 'reach';}
    if (difference > 5) {return 'fair';}
    if (difference < -10) {return 'steal';}
    return 'value';
  }

  private createEmptyProjections(): PlayerProjections {
    return {
      source: 'none',
      scoringFormat: 'ppr',
      weeklyProjection: false,
      seasonProjection: false
    };
  }

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