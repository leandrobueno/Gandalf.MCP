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

export interface ISleeperApiClient {
  getUser(username: string): Promise<SleeperUser | null>;
  getUserLeagues(userId: string, sport: string, season: string): Promise<SleeperLeague[]>;
  getLeague(leagueId: string): Promise<SleeperLeague | null>;
  getRosters(leagueId: string): Promise<SleeperRoster[]>;
  getLeagueUsers(leagueId: string): Promise<SleeperUser[]>;
  getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]>;
  getTransactions(leagueId: string, week: number): Promise<SleeperTransaction[]>;
  getAllPlayers(): Promise<Record<string, SleeperPlayer>>;
  getTrendingPlayers(sport: string, type: string, hours?: number): Promise<SleeperTrendingPlayer[]>;
  getNFLState(): Promise<SleeperNFLState | null>;
  getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]>;
  getDraft(draftId: string): Promise<SleeperDraft | null>;
  getDraftPicks(draftId: string): Promise<SleeperDraftPick[]>;
}

export class SleeperApiClient implements ISleeperApiClient {
  private static readonly BASE_URL = 'https://api.sleeper.app/v1/';
  private httpClient: AxiosInstance;

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