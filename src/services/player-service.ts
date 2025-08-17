import { ISleeperApiClient } from './sleeper-api-client.js';
import { ICacheService } from './cache-service.js';
import { SleeperPlayer } from '../models/sleeper-models.js';
import {
  IPlayerService,
  PlayerSearchOptions,
  PlayerSearchResult,
  PlayerSummary,
  PlayerDetails,
  TrendingPlayerOptions,
  TrendingPlayerResult,
  TrendingPlayer
} from '../models/player-models.js';


/**
 * Service for managing player data and search operations.
 * Provides caching, searching, and player detail retrieval from Sleeper API.
 */
export class PlayerService implements IPlayerService {
  private playersByPosition: Map<string, SleeperPlayer[]> = new Map();
  private playersByTeam: Map<string, SleeperPlayer[]> = new Map();
  private searchIndexLastUpdated: string | null = null;

  constructor(
    private sleeperClient: ISleeperApiClient,
    private cacheService: ICacheService
  ) {}

  /**
   * Searches for players based on provided criteria.
   * Uses optimized indexing for position and team filters.
   * @param options - Search parameters including query text, position, team filters
   * @returns Promise resolving to search results with matched players
   * @example
   * ```typescript
   * const results = await playerService.searchPlayers({ 
   *   query: "mahomes", 
   *   position: "QB",
   *   maxResults: 10 
   * });
   * ```
   */
  async searchPlayers(options: PlayerSearchOptions = {}): Promise<PlayerSearchResult> {
    const { query, position, team, maxResults = 20 } = options;

    try {
      await this.ensureSearchIndexUpdated();
      
      let filteredPlayers: SleeperPlayer[];

      // Use indexes for better performance when possible
      if (position && !team && !query) {
        // Pure position search - use index
        filteredPlayers = this.playersByPosition.get(position.toUpperCase()) || [];
      } else if (team && !position && !query) {
        // Pure team search - use index
        filteredPlayers = this.playersByTeam.get(team.toUpperCase()) || [];
      } else if (position && team && !query) {
        // Position + team combination
        const positionPlayers = this.playersByPosition.get(position.toUpperCase()) || [];
        filteredPlayers = positionPlayers.filter(p => p.team === team.toUpperCase());
      } else {
        // Fallback to full search for complex queries
        const allPlayers = await this.getCachedPlayers();
        filteredPlayers = Object.values(allPlayers).filter(p => p.status === 'Active');

        // Apply filters sequentially
        if (position) {
          filteredPlayers = filteredPlayers.filter(p => 
            p.position === position.toUpperCase() ||
            p.fantasy_positions?.includes(position.toUpperCase())
          );
        }

        if (team) {
          filteredPlayers = filteredPlayers.filter(p => p.team === team.toUpperCase());
        }

        if (query) {
          const searchTerm = query.toLowerCase();
          filteredPlayers = filteredPlayers.filter(p => 
            p.full_name?.toLowerCase().includes(searchTerm) ||
            p.first_name?.toLowerCase().includes(searchTerm) ||
            p.last_name?.toLowerCase().includes(searchTerm) ||
            p.team?.toLowerCase().includes(searchTerm)
          );
        }
      }

      // Sort by search rank and limit results
      const sortedPlayers = filteredPlayers
        .sort((a, b) => (a.search_rank || 9999) - (b.search_rank || 9999))
        .slice(0, maxResults);

      const players: PlayerSummary[] = sortedPlayers.map(this.mapToPlayerSummary);

      return {
        totalFound: filteredPlayers.length,
        players,
        filters: {
          query: query || undefined,
          position: position || undefined,
          team: team || undefined
        }
      };
    } catch (error) {
      console.error('Error searching players:', error);
      throw error;
    }
  }

  /**
   * Retrieves detailed information for a specific player.
   * @param playerIdOrName - Player ID or full name to search for
   * @returns Promise resolving to player details or null if not found
   * @example
   * ```typescript
   * const player = await playerService.getPlayer("4034");
   * const playerByName = await playerService.getPlayer("Patrick Mahomes");
   * ```
   */
  async getPlayer(playerIdOrName: string): Promise<PlayerDetails | null> {
    try {
      const allPlayers = await this.getCachedPlayers();
      let player: SleeperPlayer | undefined;

      // Try to find by ID first
      if (allPlayers[playerIdOrName]) {
        player = allPlayers[playerIdOrName];
      } else {
        // Search by name
        const searchTerm = playerIdOrName.toLowerCase();
        player = Object.values(allPlayers).find(p => 
          p.full_name?.toLowerCase() === searchTerm ||
          `${p.first_name} ${p.last_name}`.toLowerCase() === searchTerm
        );
      }

      if (!player) {
        return null;
      }

      return this.mapToPlayerDetails(player);
    } catch (error) {
      console.error(`Error getting player ${playerIdOrName}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves multiple players by their IDs in a single batch operation.
   * More efficient than multiple individual getPlayer calls.
   * @param playerIds - Array of player IDs to retrieve
   * @returns Promise resolving to map of player ID to player details
   * @example
   * ```typescript
   * const playerMap = await playerService.getPlayersBatch(["4034", "4036", "4037"]);
   * playerMap.get("4034")?.fullName; // "Patrick Mahomes"
   * ```
   */
  async getPlayersBatch(playerIds: string[]): Promise<Map<string, PlayerDetails | null>> {
    if (playerIds.length === 0) {
      return new Map();
    }

    try {
      const allPlayers = await this.getCachedPlayers();
      const playerMap = new Map<string, PlayerDetails | null>();

      for (const playerId of playerIds) {
        const player = allPlayers[playerId];
        if (player) {
          playerMap.set(playerId, this.mapToPlayerDetails(player));
        } else {
          playerMap.set(playerId, null);
        }
      }

      return playerMap;
    } catch (error) {
      console.error(`Error getting players batch:`, error);
      throw error;
    }
  }

  /**
   * Gets trending players based on add/drop activity.
   * @param options - Trending options including type (add/drop), time period, and limit
   * @returns Promise resolving to trending players with activity counts
   * @example
   * ```typescript
   * const trending = await playerService.getTrendingPlayers({ 
   *   type: "add", 
   *   hours: 24, 
   *   limit: 10 
   * });
   * ```
   */
  async getTrendingPlayers(options: TrendingPlayerOptions = {}): Promise<TrendingPlayerResult> {
    const { type = 'add', hours = 24, limit = 25 } = options;

    try {
      const trending = await this.sleeperClient.getTrendingPlayers('nfl', type, hours);
      const limitedTrending = trending.slice(0, limit);

      // Get player details for trending players
      const allPlayers = await this.getCachedPlayers();

      const players: TrendingPlayer[] = limitedTrending.map(tp => {
        const player = allPlayers[tp.player_id];
        return {
          playerId: tp.player_id,
          count: tp.count,
          fullName: player?.full_name || `${player?.first_name} ${player?.last_name}`,
          position: player?.position,
          team: player?.team,
          injuryStatus: player?.injury_status
        };
      });

      return {
        type,
        hours,
        totalCount: trending.length,
        players
      };
    } catch (error) {
      console.error('Error getting trending players:', error);
      throw error;
    }
  }

  /**
   * Ensures search indexes are updated when player data changes.
   * Rebuilds position and team indexes if data has been refreshed.
   */
  private async ensureSearchIndexUpdated(): Promise<void> {
    const currentDay = new Date().toISOString().split('T')[0];
    
    if (this.searchIndexLastUpdated !== currentDay) {
      const allPlayers = await this.getCachedPlayers();
      this.buildSearchIndexes(allPlayers);
      this.searchIndexLastUpdated = currentDay;
    }
  }

  /**
   * Builds optimized search indexes for position and team filtering.
   * @param allPlayers - All player data to index
   */
  private buildSearchIndexes(allPlayers: Record<string, SleeperPlayer>): void {
    this.playersByPosition.clear();
    this.playersByTeam.clear();

    const activePlayers = Object.values(allPlayers).filter(p => p.status === 'Active');

    for (const player of activePlayers) {
      // Index by position
      if (player.position) {
        if (!this.playersByPosition.has(player.position)) {
          this.playersByPosition.set(player.position, []);
        }
        this.playersByPosition.get(player.position)?.push(player);
      }

      // Index by fantasy positions too
      if (player.fantasy_positions) {
        for (const position of player.fantasy_positions) {
          if (!this.playersByPosition.has(position)) {
            this.playersByPosition.set(position, []);
          }
          this.playersByPosition.get(position)?.push(player);
        }
      }

      // Index by team
      if (player.team) {
        if (!this.playersByTeam.has(player.team)) {
          this.playersByTeam.set(player.team, []);
        }
        this.playersByTeam.get(player.team)?.push(player);
      }
    }
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

  /**
   * Maps Sleeper player data to summary format.
   * @param player - Raw Sleeper player object
   * @returns Formatted player summary
   */
  private mapToPlayerSummary(player: SleeperPlayer): PlayerSummary {
    return {
      playerId: player.player_id,
      fullName: player.full_name || `${player.first_name} ${player.last_name}`,
      position: player.position,
      team: player.team,
      fantasyPositions: player.fantasy_positions,
      age: player.age,
      yearsExp: player.years_exp,
      injuryStatus: player.injury_status,
      searchRank: player.search_rank
    };
  }

  /**
   * Maps Sleeper player data to detailed format.
   * @param player - Raw Sleeper player object
   * @returns Formatted detailed player information
   */
  private mapToPlayerDetails(player: SleeperPlayer): PlayerDetails {
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
  }
}