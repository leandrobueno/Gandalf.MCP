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


export class PlayerService implements IPlayerService {
  constructor(
    private sleeperClient: ISleeperApiClient,
    private cacheService: ICacheService
  ) {}

  async searchPlayers(options: PlayerSearchOptions = {}): Promise<PlayerSearchResult> {
    const { query, position, team, maxResults = 20 } = options;

    try {
      const allPlayers = await this.getCachedPlayers();
      let filteredPlayers = Object.values(allPlayers).filter(p => p.status === 'Active');

      // Apply filters
      if (query) {
        const searchTerm = query.toLowerCase();
        filteredPlayers = filteredPlayers.filter(p => 
          p.full_name?.toLowerCase().includes(searchTerm) ||
          p.first_name?.toLowerCase().includes(searchTerm) ||
          p.last_name?.toLowerCase().includes(searchTerm) ||
          p.team?.toLowerCase().includes(searchTerm)
        );
      }

      if (position) {
        filteredPlayers = filteredPlayers.filter(p => 
          p.position === position.toUpperCase() ||
          p.fantasy_positions?.includes(position.toUpperCase())
        );
      }

      if (team) {
        filteredPlayers = filteredPlayers.filter(p => p.team === team.toUpperCase());
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

  private async getCachedPlayers(): Promise<Record<string, SleeperPlayer>> {
    const cacheKey = `players_nfl_${new Date().toISOString().split('T')[0]}`;
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.sleeperClient.getAllPlayers(),
      24 * 60 * 60 // 24 hours
    );
  }

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