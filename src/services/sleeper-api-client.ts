import axios, { AxiosInstance } from 'axios';
import {
  SleeperUser,
  SleeperLeague,
  SleeperRoster,
  SleeperMatchup,
  SleeperTransaction,
  SleeperPlayer,
  SleeperTrendingPlayer,
  SleeperNFLState,
  SleeperDraft,
  SleeperDraftPick
} from '../models/sleeper-models.js';

/**
 * Interface defining the contract for Sleeper API client operations.
 * Provides comprehensive access to Sleeper fantasy football data including
 * users, leagues, rosters, matchups, drafts, and player information.
 */
export interface ISleeperApiClient {
  /** Retrieves user information by username */
  getUser(username: string): Promise<SleeperUser | null>;
  /** Retrieves all leagues for a user in a specific sport and season */
  getUserLeagues(userId: string, sport: string, season: string): Promise<SleeperLeague[]>;
  /** Retrieves detailed league information */
  getLeague(leagueId: string): Promise<SleeperLeague | null>;
  /** Retrieves all rosters in a league */
  getRosters(leagueId: string): Promise<SleeperRoster[]>;
  /** Retrieves all users in a league */
  getLeagueUsers(leagueId: string): Promise<SleeperUser[]>;
  /** Retrieves matchups for a specific week */
  getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]>;
  /** Retrieves transactions for a specific week */
  getTransactions(leagueId: string, week: number): Promise<SleeperTransaction[]>;
  /** Retrieves all NFL players data */
  getAllPlayers(): Promise<Record<string, SleeperPlayer>>;
  /** Retrieves trending players based on add/drop activity */
  getTrendingPlayers(sport: string, type: string, hours?: number): Promise<SleeperTrendingPlayer[]>;
  /** Retrieves current NFL season state */
  getNFLState(): Promise<SleeperNFLState | null>;
  /** Retrieves all drafts for a league */
  getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]>;
  /** Retrieves specific draft information */
  getDraft(draftId: string): Promise<SleeperDraft | null>;
  /** Retrieves all picks for a specific draft */
  getDraftPicks(draftId: string): Promise<SleeperDraftPick[]>;
}

/**
 * HTTP client for accessing the Sleeper API.
 * Provides robust error handling, logging, and typed responses
 * for all Sleeper fantasy football data endpoints.
 */
export class SleeperApiClient implements ISleeperApiClient {
  private static readonly BASE_URL = 'https://api.sleeper.app/v1/';
  private httpClient: AxiosInstance;

  /**
   * Creates a new SleeperApiClient instance with configured HTTP settings.
   * Sets up axios client with appropriate headers, timeouts, and base URL.
   */
  constructor() {
    this.httpClient = axios.create({
      baseURL: SleeperApiClient.BASE_URL,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Gandalf-MCP-Server/1.0'
      },
      timeout: 30000
    });
  }

  /**
   * Retrieves user information by username from Sleeper API.
   * @param username - Sleeper username to lookup
   * @returns Promise resolving to user data or null if not found
   * @example
   * ```typescript
   * const user = await sleeperClient.getUser("john_doe");
   * console.log(user?.display_name);
   * ```
   */
  async getUser(username: string): Promise<SleeperUser | null> {
    try {
      console.info(`Fetching user: ${username}`);
      const response = await this.httpClient.get<SleeperUser>(`user/${username}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn(`User ${username} not found`);
        return null;
      }
      console.error(`Error fetching user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves all leagues for a user in a specific sport and season.
   * @param userId - Unique user identifier
   * @param sport - Sport type (typically 'nfl')
   * @param season - Season year as string
   * @returns Promise resolving to array of user's leagues
   * @example
   * ```typescript
   * const leagues = await sleeperClient.getUserLeagues("123456", "nfl", "2024");
   * ```
   */
  async getUserLeagues(userId: string, sport: string, season: string): Promise<SleeperLeague[]> {
    try {
      console.info(`Fetching leagues for user ${userId}, sport ${sport}, season ${season}`);
      const response = await this.httpClient.get<SleeperLeague[]>(`user/${userId}/leagues/${sport}/${season}`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching leagues for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves detailed league information.
   * @param leagueId - Unique league identifier
   * @returns Promise resolving to league data or null if not found
   * @example
   * ```typescript
   * const league = await sleeperClient.getLeague("123456789");
   * console.log(`League: ${league?.name}`);
   * ```
   */
  async getLeague(leagueId: string): Promise<SleeperLeague | null> {
    try {
      console.info(`Fetching league: ${leagueId}`);
      const response = await this.httpClient.get<SleeperLeague>(`league/${leagueId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn(`League ${leagueId} not found`);
        return null;
      }
      console.error(`Error fetching league ${leagueId}:`, error);
      throw error;
    }
  }

  async getRosters(leagueId: string): Promise<SleeperRoster[]> {
    try {
      console.info(`Fetching rosters for league: ${leagueId}`);
      const response = await this.httpClient.get<SleeperRoster[]>(`league/${leagueId}/rosters`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching rosters for league ${leagueId}:`, error);
      throw error;
    }
  }

  async getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    try {
      console.info(`Fetching users for league: ${leagueId}`);
      const response = await this.httpClient.get<SleeperUser[]>(`league/${leagueId}/users`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching users for league ${leagueId}:`, error);
      throw error;
    }
  }

  async getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    try {
      console.info(`Fetching matchups for league ${leagueId}, week ${week}`);
      const response = await this.httpClient.get<SleeperMatchup[]>(`league/${leagueId}/matchups/${week}`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching matchups for league ${leagueId}, week ${week}:`, error);
      throw error;
    }
  }

  async getTransactions(leagueId: string, week: number): Promise<SleeperTransaction[]> {
    try {
      console.info(`Fetching transactions for league ${leagueId}, week ${week}`);
      const response = await this.httpClient.get<SleeperTransaction[]>(`league/${leagueId}/transactions/${week}`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching transactions for league ${leagueId}, week ${week}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves all NFL players data from Sleeper API.
   * @returns Promise resolving to player data indexed by player ID
   * @example
   * ```typescript
   * const players = await sleeperClient.getAllPlayers();
   * const mahomes = players['4034'];
   * ```
   */
  async getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
    try {
      console.info('Fetching all NFL players');
      const response = await this.httpClient.get<Record<string, SleeperPlayer>>('players/nfl');
      return response.data || {};
    } catch (error) {
      console.error('Error fetching all players:', error);
      throw error;
    }
  }

  /**
   * Retrieves trending players based on add/drop activity.
   * @param sport - Sport type (typically 'nfl')
   * @param type - Trend type ('add' or 'drop')
   * @param hours - Time window for trending data (default 24 hours)
   * @returns Promise resolving to trending players with activity counts
   * @example
   * ```typescript
   * const trending = await sleeperClient.getTrendingPlayers('nfl', 'add', 12);
   * ```
   */
  async getTrendingPlayers(sport: string, type: string, hours: number = 24): Promise<SleeperTrendingPlayer[]> {
    try {
      console.info(`Fetching trending players: sport=${sport}, type=${type}, hours=${hours}`);
      const response = await this.httpClient.get<SleeperTrendingPlayer[]>(`players/${sport}/trending/${type}`, {
        params: { lookback_hours: hours }
      });
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching trending players:`, error);
      throw error;
    }
  }

  /**
   * Retrieves current NFL season state including current week and season.
   * @returns Promise resolving to NFL state data
   * @example
   * ```typescript
   * const nflState = await sleeperClient.getNFLState();
   * console.log(`Week ${nflState?.week} of ${nflState?.season}`);
   * ```
   */
  async getNFLState(): Promise<SleeperNFLState | null> {
    try {
      console.info('Fetching NFL state');
      const response = await this.httpClient.get<SleeperNFLState>('state/nfl');
      return response.data;
    } catch (error) {
      console.error('Error fetching NFL state:', error);
      throw error;
    }
  }

  async getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]> {
    try {
      console.info(`Fetching drafts for league: ${leagueId}`);
      const response = await this.httpClient.get<SleeperDraft[]>(`league/${leagueId}/drafts`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching drafts for league ${leagueId}:`, error);
      throw error;
    }
  }

  async getDraft(draftId: string): Promise<SleeperDraft | null> {
    try {
      console.info(`Fetching draft: ${draftId}`);
      const response = await this.httpClient.get<SleeperDraft>(`draft/${draftId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn(`Draft ${draftId} not found`);
        return null;
      }
      console.error(`Error fetching draft ${draftId}:`, error);
      throw error;
    }
  }

  async getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
    try {
      console.info(`Fetching draft picks for draft: ${draftId}`);
      const response = await this.httpClient.get<SleeperDraftPick[]>(`draft/${draftId}/picks`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching draft picks for draft ${draftId}:`, error);
      throw error;
    }
  }
}