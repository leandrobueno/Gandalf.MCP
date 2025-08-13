import { ISleeperApiClient } from './sleeper-api-client.js';
import { SleeperMatchup } from '../models/sleeper-models.js';
import { IHistoricalCacheService } from './historical-cache-service.js';
import {
  ILeagueService,
  UserLeaguesResult,
  LeagueSummary,
  LeagueDetails,
  MatchupsResult,
  MatchupDetails,
  TransactionsResult,
  TransactionDetails
} from '../models/league-models.js';


export class LeagueService implements ILeagueService {
  constructor(
    private sleeperClient: ISleeperApiClient,
    private historicalCache: IHistoricalCacheService
  ) {}

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
    
    const leagueSummaries: LeagueSummary[] = leagues.map(league => ({
      leagueId: league.league_id,
      name: league.name,
      season: league.season,
      status: league.status,
      totalRosters: league.total_rosters,
      scoringType: this.getScoringType(league.scoring_settings),
      draftStatus: 'Unknown' // Would need to fetch draft info separately
    }));

    return {
      user: {
        userId: user.user_id,
        username: user.username,
        displayName: user.display_name
      },
      season,
      totalLeagues: leagues.length,
      leagues: leagueSummaries
    };
  }

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

  async getMatchups(leagueId: string, week?: number): Promise<MatchupsResult> {
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

    const matchupDetails: MatchupDetails[] = Object.entries(groupedMatchups).map(([matchupId, teams]) => ({
      matchupId: parseInt(matchupId),
      teams: teams.map(team => ({
        rosterId: team.roster_id,
        points: team.points,
        starters: team.starters,
        players: team.players,
        playersPoints: team.players_points
      }))
    }));

    return {
      leagueId,
      week,
      totalMatchups: Object.keys(groupedMatchups).length,
      matchups: matchupDetails
    };
  }

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

  private getScoringType(scoringSettings?: Record<string, number>): string {
    if (!scoringSettings) return 'Unknown';
    
    const ppr = scoringSettings['rec'] || 0;
    if (ppr >= 1) return 'Full PPR';
    if (ppr >= 0.5) return 'Half PPR';
    return 'Standard';
  }
}