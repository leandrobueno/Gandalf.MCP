import {ISleeperApiClient} from './sleeper-api-client.js';
import {ICacheService} from './cache-service.js';
import {SleeperPlayer, SleeperUser} from '../models/sleeper-models.js';
import {AllRostersResult, IRosterService, PlayerInfo, RosterDetails, RosterSummary} from '../models/roster-models.js';

/**
 * Service for managing roster operations and player information.
 * Provides roster summaries, detailed roster information, standings, and player details.
 */
export class RosterService implements IRosterService {
  /**
   * Creates a new RosterService instance.
   * @param sleeperClient - Client for Sleeper API operations
   * @param cacheService - Service for caching player data
   */
  constructor(
    private sleeperClient: ISleeperApiClient,
    private cacheService: ICacheService
  ) {}

  /**
   * Retrieves all rosters in a league with standings and summary information.
   * @param leagueId - Unique league identifier
   * @returns Promise resolving to all rosters with standings sorted by record
   * @example
   * ```typescript
   * const rosters = await rosterService.getAllRosters("league123");
   * console.log(`League has ${rosters.totalRosters} teams`);
   * rosters.rosters.forEach(roster => {
   *   console.log(`${roster.ownerUsername}: ${roster.wins}-${roster.losses}`);
   * });
   * ```
   */
  async getAllRosters(leagueId: string): Promise<AllRostersResult> {
    const [rosters, users, league] = await Promise.all([
      this.sleeperClient.getRosters(leagueId),
      this.sleeperClient.getLeagueUsers(leagueId),
      this.sleeperClient.getLeague(leagueId)
    ]);

    if (!league) {
      throw new Error(`League not found: ${leagueId}`);
    }

    // Create user lookup
    const userLookup = users.reduce((acc, user) => {
      acc[user.user_id] = user;
      return acc;
    }, {} as Record<string, SleeperUser>);

    // Format rosters with standings
    const rosterSummaries: RosterSummary[] = rosters
      .map(roster => {
        const owner = roster.owner_id ? userLookup[roster.owner_id] : null;
        return {
          rosterId: roster.roster_id,
          ownerId: roster.owner_id,
          ownerUsername: owner?.username,
          ownerDisplayName: owner?.display_name,
          wins: roster.settings?.wins || 0,
          losses: roster.settings?.losses || 0,
          ties: roster.settings?.ties || 0,
          totalPoints: roster.settings?.fpts || roster.settings?.fpts_decimal || 0,
          pointsAgainst: roster.settings?.fpts_against || roster.settings?.fpts_against_decimal || 0,
          playerCount: roster.players?.length || 0,
          starterCount: roster.starters?.length || 0
        };
      })
      .sort((a, b) => {
        // Sort by wins desc, then total points desc
        if (a.wins !== b.wins) {return b.wins - a.wins;}
        return b.totalPoints - a.totalPoints;
      });

    return {
      league: {
        leagueId: league.league_id,
        name: league.name,
        season: league.season,
        totalRosters: league.total_rosters
      },
      totalRosters: rosters.length,
      rosters: rosterSummaries
    };
  }

  /**
   * Retrieves detailed roster information for a specific team.
   * @param leagueId - Unique league identifier
   * @param rosterIdOrUsername - Roster ID, username, or display name to search for
   * @returns Promise resolving to detailed roster info or null if not found
   * @example
   * ```typescript
   * const roster = await rosterService.getRoster("league123", "john_doe");
   * if (roster) {
   *   console.log(`${roster.owner?.username} has ${roster.starters.length} starters`);
   *   roster.starters.forEach(player => {
   *     console.log(`${player.fullName} (${player.position})`);
   *   });
   * }
   * ```
   */
  async getRoster(leagueId: string, rosterIdOrUsername: string): Promise<RosterDetails | null> {
    const [rosters, users] = await Promise.all([
      this.sleeperClient.getRosters(leagueId),
      this.sleeperClient.getLeagueUsers(leagueId)
    ]);

    // Create user lookup
    const userLookup = users.reduce((acc, user) => {
      acc[user.user_id] = user;
      return acc;
    }, {} as Record<string, SleeperUser>);

    // Find roster by ID or username
    let targetRoster = rosters.find(r => r.roster_id.toString() === rosterIdOrUsername);
    
    if (!targetRoster) {
      // Try to find by username
      const targetUser = users.find(u => 
        u.username.toLowerCase() === rosterIdOrUsername.toLowerCase() ||
        u.display_name?.toLowerCase() === rosterIdOrUsername.toLowerCase()
      );
      
      if (targetUser) {
        targetRoster = rosters.find(r => r.owner_id === targetUser.user_id);
      }
    }

    if (!targetRoster) {
      return null;
    }

    // Get player details
    const allPlayers = await this.getCachedPlayers();
    const getPlayerDetails = (playerId: string): PlayerInfo => {
      const player = allPlayers[playerId];
      return player ? {
        playerId,
        fullName: player.full_name || `${player.first_name} ${player.last_name}`,
        position: player.position,
        team: player.team,
        injuryStatus: player.injury_status
      } : {
        playerId,
        fullName: 'Unknown Player',
        position: 'UNK',
        team: 'UNK',
        injuryStatus: undefined
      };
    };

    const owner = targetRoster.owner_id ? userLookup[targetRoster.owner_id] : undefined;

    return {
        rosterId: targetRoster.roster_id,
        owner: owner ? {
            userId: owner.user_id,
            username: owner.username,
            displayName: owner.display_name,
            avatar: owner.avatar
        } : undefined,
        record: {
            wins: targetRoster.settings?.wins || 0,
            losses: targetRoster.settings?.losses || 0,
            ties: targetRoster.settings?.ties || 0,
            totalPoints: targetRoster.settings?.fpts || targetRoster.settings?.fpts_decimal || 0,
            pointsAgainst: targetRoster.settings?.fpts_against || targetRoster.settings?.fpts_against_decimal || 0
        },
        starters: targetRoster.starters?.map(getPlayerDetails) || [],
        bench: targetRoster.players?.filter(p => !targetRoster.starters?.includes(p)).map(getPlayerDetails) || [],
        reserve: targetRoster.reserve?.map(getPlayerDetails) || [],
        taxi: targetRoster.taxi?.map(getPlayerDetails) || []
    };
  }

  /**
   * Retrieves and caches all NFL players for the current day.
   * @returns Promise resolving to all players indexed by player ID
   */
  private async getCachedPlayers(): Promise<Record<string, SleeperPlayer>> {
    const cacheKey = `players_nfl_${new Date().toISOString().split('T')[0]}`;
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.sleeperClient.getAllPlayers(),
      24 * 60 * 60 // 24 hours
    );
  }
}