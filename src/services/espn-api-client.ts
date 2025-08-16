import axios, { AxiosInstance } from 'axios';
import {
  EspnInjuryReport,
  EspnInjuryResponse,
  EspnNewsItem,
  EspnNewsResponse,
  EspnAthlete
} from '../models/espn-models.js';

/**
 * Interface defining the contract for ESPN API client operations.
 * Provides access to ESPN's NFL data including injury reports, news, and athlete information.
 */
export interface IEspnApiClient {
  /** Retrieves injury reports with optional team filtering */
  getInjuryReports(teamAbbreviation?: string): Promise<EspnInjuryReport[]>;
  /** Retrieves news articles with optional team and limit filtering */
  getNews(teamId?: string, limit?: number): Promise<EspnNewsItem[]>;
  /** Retrieves detailed athlete information */
  getAthlete(athleteId: string): Promise<EspnAthlete | null>;
}

/**
 * HTTP client for accessing ESPN's public API.
 * Provides access to NFL injury reports, news articles, and athlete data
 * with robust error handling and logging capabilities.
 */
export class EspnApiClient implements IEspnApiClient {
  private httpClient: AxiosInstance;

  /**
   * Creates a new EspnApiClient instance with configured HTTP settings.
   * Sets up axios client with ESPN API base URL, headers, and timeout.
   */
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

  /**
   * Retrieves NFL injury reports from ESPN API.
   * @param teamAbbreviation - Optional team abbreviation to filter results (e.g., 'KC', 'DAL')
   * @returns Promise resolving to array of injury reports
   * @example
   * ```typescript
   * const allInjuries = await espnClient.getInjuryReports();
   * const chiefsInjuries = await espnClient.getInjuryReports('KC');
   * ```
   */
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

  /**
   * Retrieves NFL news articles from ESPN API.
   * @param teamId - Optional team ID to filter news to specific team
   * @param limit - Maximum number of articles to return (default 20)
   * @returns Promise resolving to array of news articles
   * @example
   * ```typescript
   * const generalNews = await espnClient.getNews(undefined, 10);
   * const teamNews = await espnClient.getNews('kc', 5);
   * ```
   */
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

  /**
   * Retrieves detailed athlete information from ESPN API.
   * @param athleteId - ESPN's unique athlete identifier
   * @returns Promise resolving to athlete data or null if not found
   * @example
   * ```typescript
   * const athlete = await espnClient.getAthlete('3139477');
   * console.log(athlete?.displayName);
   * ```
   */
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