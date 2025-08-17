import { ISleeperApiClient } from './sleeper-api-client.js';
import { SleeperMatchup } from '../models/sleeper-models.js';
import { IHistoricalCacheService } from './historical-cache-service.js';
import { IPlayerService } from '../models/player-models.js';
import {
  ILeagueService,
  UserLeaguesResult,
  LeagueSummary,
  LeagueDetails,
  MatchupsResult,
  MatchupDetails,
  TransactionsResult,
  TransactionDetails,
  PlayerMatchupInfo
} from '../models/league-models.js';


/**
 * Service for managing league operations and data retrieval.
 * Provides league information, matchups, transactions with historical data caching.
 */
export class LeagueService implements ILeagueService {
  // Object pools for frequently created objects
  private readonly leagueSummaryPool: LeagueSummary[] = [];
  private readonly userSummaryPool: any[] = [];

  constructor(
    private sleeperClient: ISleeperApiClient,
    private historicalCache: IHistoricalCacheService,
    private playerService: IPlayerService
  ) {}

  /**
   * Retrieves all leagues for a specific user and season.
   * @param username - Sleeper username to search for
   * @param season - Optional season year (defaults to current season)
   * @returns Promise resolving to user's leagues information
   * @example
   * ```typescript
   * const leagues = await leagueService.getUserLeagues("john_doe", "2024");
   * ```
   */
  async getUserLeagues(username: string, season?: string): Promise<UserLeaguesResult> {
    // Get current season if not provided
    if (!season) {
      const nflState = await this.historicalCache.getCurrentNFLState();
      season = nflState?.season || '2024';
    }

    // Get user first
    const user = await this.sleeperClient.getUser(username);
    if (!user) {
      throw new Error(`User not found: ${username}`);
    }

    // Check if this is historical data
    const isHistorical = await this.historicalCache.isHistoricalData(season);
    
    let leagues;
    if (isHistorical) {
      // Use historical cache for past seasons
      const cacheKey = `user_${user.user_id}_leagues_nfl_${season}`;
      leagues = await this.historicalCache.getOrSetHistorical(
        cacheKey,
        () => this.sleeperClient.getUserLeagues(user.user_id, 'nfl', season),
        'leagues',
        season
      );
    } else {
      // Current season - use regular API call (could add regular caching here too)
      leagues = await this.sleeperClient.getUserLeagues(user.user_id, 'nfl', season);
    }
    
    // Use object pooling for better memory efficiency
    const leagueSummaries: LeagueSummary[] = leagues.map(league => {
      const summary = this.getPooledLeagueSummary();
      summary.leagueId = league.league_id;
      summary.name = league.name;
      summary.season = league.season;
      summary.status = league.status;
      summary.totalRosters = league.total_rosters;
      summary.scoringType = this.getScoringType(league.scoring_settings);
      summary.draftStatus = 'Unknown'; // Would need to fetch draft info separately
      return summary;
    });

    const userSummary = this.getPooledUserSummary();
    userSummary.userId = user.user_id;
    userSummary.username = user.username;
    userSummary.displayName = user.display_name;

    return {
      user: userSummary,
      season,
      totalLeagues: leagues.length,
      leagues: leagueSummaries
    };
  }

  /**
   * Gets detailed information about a specific league.
   * @param leagueId - Unique league identifier
   * @returns Promise resolving to league details or null if not found
   */
  async getLeagueDetails(leagueId: string): Promise<LeagueDetails | null> {
    const league = await this.sleeperClient.getLeague(leagueId);
    if (!league) {
      return null;
    }

    return {
      leagueId: league.league_id,
      name: league.name,
      season: league.season,
      seasonType: league.season_type,
      status: league.status,
      totalRosters: league.total_rosters,
      sport: league.sport,
      rosterPositions: league.roster_positions,
      scoringSettings: league.scoring_settings,
      settings: league.settings,
      scoringType: this.getScoringType(league.scoring_settings)
    };
  }

  /**
   * Retrieves matchups for a specific league and week.
   * @param leagueId - League identifier
   * @param week - Week number (defaults to current week)
   * @param includePlayerDetails - Whether to include detailed player information
   * @param includeRosterDetails - Whether to include full roster details
   * @returns Promise resolving to matchup information with optional player details
   */
  async getMatchups(leagueId: string, week?: number, includePlayerDetails?: boolean, includeRosterDetails?: boolean): Promise<MatchupsResult> {
    // Get league details to determine season
    const league = await this.sleeperClient.getLeague(leagueId);
    if (!league) {
      throw new Error(`League not found: ${leagueId}`);
    }

    // Get current week if not provided
    if (!week) {
      const nflState = await this.historicalCache.getCurrentNFLState();
      week = nflState?.week || 1;
    }

    // Check if this is historical data
    const isHistorical = await this.historicalCache.isHistoricalData(league.season, week);
    
    let matchups;
    if (isHistorical) {
      // Use historical cache for completed weeks
      const cacheKey = `league_${leagueId}_week_${week}_matchups`;
      matchups = await this.historicalCache.getOrSetHistorical(
        cacheKey,
        () => this.sleeperClient.getMatchups(leagueId, week),
        'matchups',
        league.season,
        week
      );
    } else {
      // Current week - use regular API call
      matchups = await this.sleeperClient.getMatchups(leagueId, week);
    }
    
    // Group matchups by matchup_id
    const groupedMatchups = matchups.reduce((acc, matchup) => {
      if (!acc[matchup.matchup_id]) {
        acc[matchup.matchup_id] = [];
      }
      acc[matchup.matchup_id].push(matchup);
      return acc;
    }, {} as Record<number, SleeperMatchup[]>);

    const matchupDetails: MatchupDetails[] = await Promise.all(
      Object.entries(groupedMatchups).map(async ([matchupId, teams]) => ({
        matchupId: parseInt(matchupId),
        teams: await Promise.all(teams.map(async team => {
          const teamMatchup: any = {
            rosterId: team.roster_id,
            points: team.points
          };

          // Include roster details if requested
          if (includeRosterDetails) {
            teamMatchup.starters = team.starters;
            teamMatchup.players = team.players;
            teamMatchup.playersPoints = team.players_points;
          }

          // Include player details if requested
          if (includePlayerDetails) {
            const playerDetails = await this.getPlayerMatchupDetails(
              team.players_points || {}, 
              team.starters || []
            );
            teamMatchup.starterDetails = playerDetails.filter(p => p.isStarter);
            if (includeRosterDetails) {
              teamMatchup.playerDetails = playerDetails;
            }
          } else {
            // Default: just include player points for scoring
            teamMatchup.playersPoints = team.players_points;
          }

          return teamMatchup;
        }))
      }))
    );

    return {
      leagueId,
      week,
      totalMatchups: Object.keys(groupedMatchups).length,
      matchups: matchupDetails
    };
  }

  /**
   * Gets transaction history for a league and week.
   * @param leagueId - League identifier
   * @param week - Week number (defaults to current week)
   * @returns Promise resolving to transaction details
   */
  async getLeagueTransactions(leagueId: string, week?: number): Promise<TransactionsResult> {
    // Get league details to determine season
    const league = await this.sleeperClient.getLeague(leagueId);
    if (!league) {
      throw new Error(`League not found: ${leagueId}`);
    }

    // Get current week if not provided
    if (!week) {
      const nflState = await this.historicalCache.getCurrentNFLState();
      week = nflState?.week || 1;
    }

    // Check if this is historical data
    const isHistorical = await this.historicalCache.isHistoricalData(league.season, week);
    
    let transactions;
    if (isHistorical) {
      // Use historical cache for completed weeks
      const cacheKey = `league_${leagueId}_week_${week}_transactions`;
      transactions = await this.historicalCache.getOrSetHistorical(
        cacheKey,
        () => this.sleeperClient.getTransactions(leagueId, week),
        'transactions',
        league.season,
        week
      );
    } else {
      // Current week - use regular API call
      transactions = await this.sleeperClient.getTransactions(leagueId, week);
    }
    
    const transactionDetails: TransactionDetails[] = transactions.map(tx => ({
      transactionId: tx.transaction_id,
      type: tx.type,
      status: tx.status,
      week: tx.week,
      rosterIds: tx.roster_ids,
      adds: tx.adds,
      drops: tx.drops,
      created: new Date(tx.created).toISOString()
    }));

    return {
      leagueId,
      week,
      totalTransactions: transactions.length,
      transactions: transactionDetails
    };
  }

  /**
   * Enriches player data with detailed information for matchup display.
   * Uses batch lookup to avoid N+1 query problem.
   * @param playersPoints - Player ID to points mapping
   * @param starters - Array of starter player IDs
   * @returns Promise resolving to detailed player matchup information
   */
  private async getPlayerMatchupDetails(
    playersPoints: Record<string, number>, 
    starters: string[]
  ): Promise<PlayerMatchupInfo[]> {
    const playerIds = Object.keys(playersPoints);
    
    // Batch lookup all players at once to avoid N+1 problem
    const playersMap = await this.playerService.getPlayersBatch(playerIds);
    
    const playerDetails: PlayerMatchupInfo[] = [];
    
    for (const [playerId, points] of Object.entries(playersPoints)) {
      const player = playersMap.get(playerId);
      const isStarter = starters.includes(playerId);
      
      playerDetails.push({
        playerId,
        name: player?.fullName || playerId,
        position: player?.position,
        team: player?.team,
        points,
        isStarter
      });
    }
    
    // Sort by starter status first, then by points
    return playerDetails.sort((a, b) => {
      if (a.isStarter && !b.isStarter) {return -1;}
      if (!a.isStarter && b.isStarter) {return 1;}
      return b.points - a.points;
    });
  }

  /**
   * Gets a pooled LeagueSummary object to reduce object allocation.
   * @returns Reusable LeagueSummary object
   */
  private getPooledLeagueSummary(): LeagueSummary {
    if (this.leagueSummaryPool.length > 0) {
      return this.leagueSummaryPool.pop()!;
    }
    return {} as LeagueSummary;
  }

  /**
   * Gets a pooled user summary object to reduce object allocation.
   * @returns Reusable user summary object
   */
  private getPooledUserSummary(): any {
    if (this.userSummaryPool.length > 0) {
      return this.userSummaryPool.pop()!;
    }
    return {};
  }

  /**
   * Returns objects to their respective pools for reuse.
   * Call this after processing results to enable object reuse.
   * @param leagueSummaries - Array of league summaries to return to pool
   * @param userSummary - User summary to return to pool
   */
  private returnObjectsToPool(leagueSummaries: LeagueSummary[], userSummary: any): void {
    // Clear objects and return to pool for reuse
    for (const summary of leagueSummaries) {
      // Clear object properties
      Object.keys(summary).forEach(key => delete (summary as any)[key]);
      if (this.leagueSummaryPool.length < 100) { // Limit pool size
        this.leagueSummaryPool.push(summary);
      }
    }
    
    if (userSummary) {
      Object.keys(userSummary).forEach(key => delete userSummary[key]);
      if (this.userSummaryPool.length < 20) { // Limit pool size
        this.userSummaryPool.push(userSummary);
      }
    }
  }

  /**
   * Determines scoring type based on league settings.
   * @param scoringSettings - League scoring configuration
   * @returns Scoring type classification (Full PPR, Half PPR, or Standard)
   */
  private getScoringType(scoringSettings?: Record<string, number>): string {
    if (!scoringSettings) {return 'Unknown';}
    
    const ppr = scoringSettings['rec'] || 0;
    if (ppr >= 1) {return 'Full PPR';}
    if (ppr >= 0.5) {return 'Half PPR';}
    return 'Standard';
  }
}