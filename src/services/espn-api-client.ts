import axios, { AxiosInstance } from 'axios';
import {
  EspnInjuryReport,
  EspnInjuryResponse,
  EspnNewsItem,
  EspnNewsResponse,
  EspnAthlete
} from '../models/espn-models.js';

export interface IEspnApiClient {
  getInjuryReports(teamAbbreviation?: string): Promise<EspnInjuryReport[]>;
  getNews(teamId?: string, limit?: number): Promise<EspnNewsItem[]>;
  getAthlete(athleteId: string): Promise<EspnAthlete | null>;
}

export class EspnApiClient implements IEspnApiClient {
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = axios.create({
      baseURL: 'https://site.api.espn.com/',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Gandalf-MCP-Server/1.0'
      },
      timeout: 30000
    });
  }

  async getInjuryReports(teamAbbreviation?: string): Promise<EspnInjuryReport[]> {
    try {
      let endpoint = 'apis/site/v2/sports/football/nfl/injuries';
      if (teamAbbreviation) {
        endpoint += `?team=${teamAbbreviation.toUpperCase()}`;
      }

      console.info(`Fetching ESPN injury reports from: ${endpoint}`);

      const response = await this.httpClient.get<EspnInjuryResponse>(endpoint);
      const injuries = response.data?.items || [];
      
      console.info(`Retrieved ${injuries.length} injury reports from ESPN`);
      return injuries;
    } catch (error) {
      console.error('Error fetching ESPN injury reports:', error);
      return [];
    }
  }

  async getNews(teamId?: string, limit: number = 20): Promise<EspnNewsItem[]> {
    try {
      let endpoint = 'apis/site/v2/sports/football/nfl/news';
      const queryParams: string[] = [`limit=${limit}`];

      if (teamId) {
        queryParams.push(`team=${teamId}`);
      }

      if (queryParams.length > 0) {
        endpoint += '?' + queryParams.join('&');
      }

      console.info(`Fetching ESPN news from: ${endpoint}`);

      const response = await this.httpClient.get<EspnNewsResponse>(endpoint);
      
      if (!response.data) {
        console.warn('ESPN news API returned null response');
        return [];
      }

      const articles = response.data.articles || [];
      console.info(`Retrieved ${articles.length} news articles from ESPN`);
      
      return articles;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.warn(`ESPN news API returned ${error.response?.status}: ${error.response?.statusText}`);
      } else {
        console.error('Error fetching ESPN news:', error);
      }
      return [];
    }
  }

  async getAthlete(athleteId: string): Promise<EspnAthlete | null> {
    try {
      const endpoint = `apis/site/v2/sports/football/nfl/athletes/${athleteId}`;
      console.info(`Fetching ESPN athlete from: ${endpoint}`);

      const response = await this.httpClient.get<EspnAthlete>(endpoint);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn(`ESPN athlete ${athleteId} not found`);
        return null;
      }
      console.error(`Error fetching ESPN athlete ${athleteId}:`, error);
      throw error;
    }
  }
}