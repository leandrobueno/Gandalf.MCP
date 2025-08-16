import { 
  PlayerNews, 
  InjuryReport,
  PlayerRankings 
} from '../models/player-intelligence-models.js';

/**
 * Interface defining the contract for ESPN intelligence client operations.
 * Provides player news, injury reports, and rankings from ESPN's API.
 */
export interface IESPNIntelligenceClient {
  /** Retrieves player news with optional filtering */
  getPlayerNews(playerId?: string, limit?: number): Promise<PlayerNews[]>;
  /** Retrieves current injury reports */
  getInjuryReports(): Promise<InjuryReport[]>;
  /** Retrieves player rankings with optional position filtering */
  getPlayerRankings(position?: string): Promise<PlayerRankings[]>;
}

/**
 * Client for retrieving fantasy football intelligence data from ESPN API.
 * Provides access to news, injury reports, and player rankings with automatic
 * content classification and impact assessment.
 */
export class ESPNIntelligenceClient implements IESPNIntelligenceClient {
  private readonly baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
  private readonly fantasyUrl = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl';

  /**
   * Retrieves recent NFL news articles from ESPN.
   * @param playerId - Optional player ID for filtering (currently not implemented)
   * @param limit - Maximum number of news items to return
   * @returns Promise resolving to array of player news with impact classification
   * @example
   * ```typescript
   * const news = await espnClient.getPlayerNews(undefined, 5);
   * console.log(`Found ${news.length} news articles`);
   * ```
   */
  async getPlayerNews(playerId?: string, limit: number = 10): Promise<PlayerNews[]> {
    try {
      const url = `${this.baseUrl}/news`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`ESPN news API failed: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      
      if (!data.articles) {
        return [];
      }

      return data.articles
        .slice(0, limit)
        .map((article: any) => ({
          headline: article.headline || '',
          summary: article.description || '',
          source: 'ESPN',
          impact: this.determineNewsImpact(article.headline, article.description),
          severity: this.determineNewsSeverity(article.headline, article.description),
          publishedAt: article.published || new Date().toISOString(),
          url: article.links?.web?.href,
          tags: article.categories?.map((cat: any) => cat.description) || []
        }));
    } catch (error) {
      console.warn('Failed to fetch ESPN player news:', error);
      return [];
    }
  }

  /**
   * Retrieves current injury reports from ESPN.
   * @returns Promise resolving to array of injury reports with status mapping
   * @example
   * ```typescript
   * const injuries = await espnClient.getInjuryReports();
   * const activeInjuries = injuries.filter(i => i.status !== 'healthy');
   * ```
   */
  async getInjuryReports(): Promise<InjuryReport[]> {
    try {
      const url = `${this.baseUrl}/injuries`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`ESPN injuries API failed: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      
      if (!data.items) {
        return [];
      }

      return data.items
        .filter((item: any) => item.injuries && item.injuries.length > 0)
        .flatMap((item: any) => 
          item.injuries.map((injury: any) => ({
            playerId: item.id || '',
            injuryType: injury.type || 'Unknown',
            bodyPart: injury.details?.type || 'Unknown',
            status: this.mapInjuryStatus(injury.status),
            description: injury.details?.detail || injury.type || 'No details available',
            source: 'ESPN',
            reportedAt: injury.date || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }))
        );
    } catch (error) {
      console.warn('Failed to fetch ESPN injury reports:', error);
      return [];
    }
  }

  /**
   * Retrieves player rankings from ESPN fantasy API.
   * @param position - Optional position filter (QB, RB, WR, TE)
   * @returns Promise resolving to player rankings with ESPN source
   * @example
   * ```typescript
   * const qbRankings = await espnClient.getPlayerRankings('QB');
   * ```
   */
  async getPlayerRankings(position?: string): Promise<PlayerRankings[]> {
    try {
      const currentYear = new Date().getFullYear();
      const url = `${this.fantasyUrl}/seasons/${currentYear}?view=kona_player_info`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`ESPN rankings API failed: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      
      if (!data.players) {
        return [];
      }

      return data.players
        .filter((player: any) => !position || this.getPositionFromId(player.defaultPositionId) === position.toUpperCase())
        .map((player: any, index: number) => ({
          source: 'espn' as const,
          position: this.getPositionFromId(player.defaultPositionId),
          rank: index + 1,
          scoringFormat: 'ppr' as const,
          lastUpdated: new Date().toISOString()
        }));
    } catch (error) {
      console.warn('Failed to fetch ESPN player rankings:', error);
      return [];
    }
  }

  /**
   * Determines the fantasy impact of news based on keyword analysis.
   * @param headline - News headline text
   * @param description - News description text
   * @returns Impact classification for fantasy relevance
   */
  private determineNewsImpact(headline: string, description: string): 'positive' | 'negative' | 'neutral' {
    const text = (headline + ' ' + description).toLowerCase();
    
    const positiveKeywords = ['breakout', 'starts', 'healthy', 'cleared', 'returns', 'promoted', 'upside'];
    const negativeKeywords = ['injured', 'out', 'suspended', 'questionable', 'doubtful', 'surgery', 'ir'];
    
    if (positiveKeywords.some(keyword => text.includes(keyword))) {
      return 'positive';
    }
    
    if (negativeKeywords.some(keyword => text.includes(keyword))) {
      return 'negative';
    }
    
    return 'neutral';
  }

  /**
   * Determines the severity level of news based on keyword analysis.
   * @param headline - News headline text
   * @param description - News description text
   * @returns Severity classification for fantasy impact
   */
  private determineNewsSeverity(headline: string, description: string): 'low' | 'medium' | 'high' {
    const text = (headline + ' ' + description).toLowerCase();
    
    const highSeverityKeywords = ['season-ending', 'surgery', 'ir', 'suspended'];
    const mediumSeverityKeywords = ['questionable', 'doubtful', 'week-to-week'];
    
    if (highSeverityKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }
    
    if (mediumSeverityKeywords.some(keyword => text.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Maps ESPN injury status strings to standardized status values.
   * @param status - Raw injury status from ESPN API
   * @returns Standardized injury status
   */
  private mapInjuryStatus(status: string): 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'pup' {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('out') || statusLower.includes('inactive')) {return 'out';}
    if (statusLower.includes('doubtful')) {return 'doubtful';}
    if (statusLower.includes('questionable')) {return 'questionable';}
    if (statusLower.includes('ir') || statusLower.includes('injured reserve')) {return 'ir';}
    if (statusLower.includes('pup')) {return 'pup';}
    
    return 'healthy';
  }

  /**
   * Converts ESPN position ID to standard position abbreviation.
   * @param positionId - ESPN's numeric position identifier
   * @returns Standard position abbreviation (QB, RB, WR, TE, K, DST)
   */
  private getPositionFromId(positionId: number): string {
    const positionMap: { [key: number]: string } = {
      1: 'QB',
      2: 'RB',
      3: 'WR',
      4: 'TE',
      5: 'K',
      16: 'DST'
    };
    
    return positionMap[positionId] || 'UNKNOWN';
  }
}