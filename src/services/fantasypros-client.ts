import { 
  PlayerRankings, 
  ExpertOpinion,
  PlayerTrends 
} from '../models/player-intelligence-models.js';

/**
 * Interface defining the contract for FantasyPros client operations.
 * Provides consensus rankings, expert opinions, player trends, and ADP data.
 */
export interface IFantasyProClient {
  /** Retrieves consensus rankings with scoring format options */
  getConsensusRankings(position?: string, scoringFormat?: 'standard' | 'ppr' | 'half-ppr'): Promise<PlayerRankings[]>;
  /** Retrieves expert opinions for a specific player */
  getExpertOpinions(playerId: string): Promise<ExpertOpinion[]>;
  /** Retrieves player trend data including ADP and ownership */
  getPlayerTrends(playerId: string): Promise<PlayerTrends | null>;
  /** Retrieves average draft position data */
  getADP(position?: string): Promise<{ playerId: string; adp: number; }[]>;
}

/**
 * Client for retrieving fantasy football data from FantasyPros.
 * Scrapes and parses consensus rankings, expert analysis, and draft data
 * to provide comprehensive player evaluation insights.
 */
export class FantasyProClient implements IFantasyProClient {
  private readonly baseUrl = 'https://www.fantasypros.com/nfl';

  /**
   * Retrieves consensus fantasy football rankings from FantasyPros.
   * @param position - Optional position filter (QB, RB, WR, TE)
   * @param scoringFormat - Scoring system for rankings (standard, ppr, half-ppr)
   * @returns Promise resolving to consensus rankings with tier and ADP data
   * @example
   * ```typescript
   * const pprRankings = await fantasyProClient.getConsensusRankings('RB', 'ppr');
   * ```
   */
  async getConsensusRankings(position?: string, scoringFormat: 'standard' | 'ppr' | 'half-ppr' = 'ppr'): Promise<PlayerRankings[]> {
    try {
      const positionParam = position ? `?position=${position.toLowerCase()}` : '';
      const formatParam = scoringFormat === 'standard' ? '' : `-${scoringFormat}`;
      
      const url = `${this.baseUrl}/rankings/consensus-cheatsheets${formatParam}.php${positionParam}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`FantasyPros rankings API failed: ${response.status}`);
        return [];
      }

      const html = await response.text();
      const rankings = this.parseRankingsFromHtml(html, scoringFormat);
      
      return rankings.map((ranking, index) => ({
        source: 'fantasypros' as const,
        position: ranking.position,
        rank: index + 1,
        tier: ranking.tier,
        adp: ranking.adp,
        scoringFormat,
        lastUpdated: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to fetch FantasyPros consensus rankings:', error);
      return [];
    }
  }

  /**
   * Retrieves expert opinions and analysis for a specific player.
   * @param playerId - Unique player identifier
   * @returns Promise resolving to expert opinions with recommendations
   * @example
   * ```typescript
   * const opinions = await fantasyProClient.getExpertOpinions('player123');
   * ```
   */
  async getExpertOpinions(playerId: string): Promise<ExpertOpinion[]> {
    try {
      const url = `${this.baseUrl}/nfl/analysis/player/${playerId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`FantasyPros expert opinions failed: ${response.status}`);
        return [];
      }

      const html = await response.text();
      return this.parseExpertOpinionsFromHtml(html);
    } catch (error) {
      console.warn('Failed to fetch FantasyPros expert opinions:', error);
      return [];
    }
  }

  /**
   * Retrieves trending data for a player including ADP and ownership changes.
   * @param playerId - Unique player identifier
   * @returns Promise resolving to trend data or null if unavailable
   * @example
   * ```typescript
   * const trends = await fantasyProClient.getPlayerTrends('player123');
   * if (trends?.adpTrend.direction === 'rising') {
   *   console.log('Player ADP is trending up');
   * }
   * ```
   */
  async getPlayerTrends(playerId: string): Promise<PlayerTrends | null> {
    try {
      const url = `${this.baseUrl}/nfl/trends/player/${playerId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`FantasyPros trends API failed: ${response.status}`);
        return null;
      }

      const html = await response.text();
      return this.parseTrendsFromHtml(html);
    } catch (error) {
      console.warn('Failed to fetch FantasyPros player trends:', error);
      return null;
    }
  }

  /**
   * Retrieves average draft position data for players.
   * @param position - Optional position filter
   * @returns Promise resolving to ADP data with player mappings
   * @example
   * ```typescript
   * const qbADP = await fantasyProClient.getADP('QB');
   * ```
   */
  async getADP(position?: string): Promise<{ playerId: string; adp: number; }[]> {
    try {
      const positionParam = position ? `?position=${position.toLowerCase()}` : '';
      const url = `${this.baseUrl}/nfl/adp/overall.php${positionParam}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`FantasyPros ADP API failed: ${response.status}`);
        return [];
      }

      const html = await response.text();
      return this.parseADPFromHtml(html);
    } catch (error) {
      console.warn('Failed to fetch FantasyPros ADP data:', error);
      return [];
    }
  }

  /**
   * Parses player rankings from FantasyPros HTML content.
   * @param html - Raw HTML content from rankings page
   * @param _scoringFormat - Scoring format (currently unused)
   * @returns Array of parsed rankings with position, tier, and ADP data
   */
  private parseRankingsFromHtml(html: string, _scoringFormat: string): Array<{position: string; tier: number; adp: number}> {
    const rankings: Array<{position: string; tier: number; adp: number}> = [];
    
    try {
      const tableRegex = /<table[^>]*class="[^"]*ranking[^"]*"[^>]*>(.*?)<\/table>/gis;
      const tableMatch = tableRegex.exec(html);
      
      if (!tableMatch) {
        return rankings;
      }
      
      const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(tableMatch[1])) !== null) {
        const cellRegex = /<td[^>]*>(.*?)<\/td>/gis;
        const cells = [];
        let cellMatch;
        
        while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
          cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
        }
        
        if (cells.length >= 3) {
          const position = this.extractPosition(cells[1] || '');
          const tier = parseInt(cells[2]) || 1;
          const adp = parseFloat(cells[3]) || 0;
          
          if (position) {
            rankings.push({ position, tier, adp });
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing rankings HTML:', error);
    }
    
    return rankings;
  }

  /**
   * Parses expert opinions from FantasyPros HTML content.
   * @param html - Raw HTML content from player analysis page
   * @returns Array of parsed expert opinions with recommendations
   */
  private parseExpertOpinionsFromHtml(html: string): ExpertOpinion[] {
    const opinions: ExpertOpinion[] = [];
    
    try {
      const opinionRegex = /<div[^>]*class="[^"]*expert-opinion[^"]*"[^>]*>(.*?)<\/div>/gis;
      let match;
      
      while ((match = opinionRegex.exec(html)) !== null) {
        const content = match[1];
        const expertMatch = /<span[^>]*class="expert-name"[^>]*>(.*?)<\/span>/i.exec(content);
        const opinionMatch = /<p[^>]*>(.*?)<\/p>/i.exec(content);
        
        if (expertMatch && opinionMatch) {
          opinions.push({
            expert: expertMatch[1].replace(/<[^>]*>/g, '').trim(),
            source: 'FantasyPros',
            opinion: opinionMatch[1].replace(/<[^>]*>/g, '').trim(),
            recommendation: this.determineRecommendation(opinionMatch[1]),
            confidence: 'medium',
            reasoning: opinionMatch[1].replace(/<[^>]*>/g, '').trim(),
            publishedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.warn('Error parsing expert opinions HTML:', error);
    }
    
    return opinions;
  }

  /**
   * Parses player trend data from FantasyPros HTML content.
   * @param html - Raw HTML content from trends page
   * @returns Parsed trend data or null if parsing fails
   */
  private parseTrendsFromHtml(html: string): PlayerTrends | null {
    try {
      const adpTrendRegex = /ADP.*?([+-]?\d+\.?\d*)/i;
      const ownershipRegex = /(\d+\.?\d*)%.*?owned/i;
      
      const adpMatch = adpTrendRegex.exec(html);
      const ownershipMatch = ownershipRegex.exec(html);
      
      if (!adpMatch && !ownershipMatch) {
        return null;
      }
      
      return {
        adpTrend: {
          direction: adpMatch && parseFloat(adpMatch[1]) > 0 ? 'rising' : 
                   adpMatch && parseFloat(adpMatch[1]) < 0 ? 'falling' : 'stable',
          change: adpMatch ? parseFloat(adpMatch[1]) : 0,
          timeframe: '7d'
        },
        ownershipTrend: {
          percentOwned: ownershipMatch ? parseFloat(ownershipMatch[1]) : 0,
          change: 0,
          timeframe: '7d'
        },
        searchTrend: {
          volume: 'medium',
          change: 0
        }
      };
    } catch (error) {
      console.warn('Error parsing trends HTML:', error);
      return null;
    }
  }

  /**
   * Parses ADP data from FantasyPros HTML content.
   * @param html - Raw HTML content from ADP page
   * @returns Array of player ADP data
   */
  private parseADPFromHtml(html: string): { playerId: string; adp: number; }[] {
    const adpData: { playerId: string; adp: number; }[] = [];
    
    try {
      const tableRegex = /<table[^>]*class="[^"]*adp[^"]*"[^>]*>(.*?)<\/table>/gis;
      const tableMatch = tableRegex.exec(html);
      
      if (!tableMatch) {
        return adpData;
      }
      
      const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(tableMatch[1])) !== null) {
        const cellRegex = /<td[^>]*>(.*?)<\/td>/gis;
        const cells = [];
        let cellMatch;
        
        while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
          cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
        }
        
        if (cells.length >= 2) {
          const playerName = cells[1];
          const adp = parseFloat(cells[2]) || 0;
          
          if (playerName && adp > 0) {
            adpData.push({
              playerId: this.generatePlayerIdFromName(playerName),
              adp
            });
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing ADP HTML:', error);
    }
    
    return adpData;
  }

  /**
   * Extracts position abbreviation from text content.
   * @param text - Text content to search for position
   * @returns Position abbreviation or empty string
   */
  private extractPosition(text: string): string {
    const positionMatch = /\b(QB|RB|WR|TE|K|DST)\b/i.exec(text);
    return positionMatch ? positionMatch[1].toUpperCase() : '';
  }

  /**
   * Determines recommendation type based on opinion content.
   * @param opinion - Expert opinion text
   * @returns Recommendation classification
   */
  private determineRecommendation(opinion: string): 'buy' | 'hold' | 'sell' | 'avoid' {
    const opinionLower = opinion.toLowerCase();
    
    if (opinionLower.includes('buy') || opinionLower.includes('target') || opinionLower.includes('upside')) {
      return 'buy';
    }
    
    if (opinionLower.includes('sell') || opinionLower.includes('fade') || opinionLower.includes('concern')) {
      return 'sell';
    }
    
    if (opinionLower.includes('avoid') || opinionLower.includes('bust')) {
      return 'avoid';
    }
    
    return 'hold';
  }

  /**
   * Generates a simple player ID from player name.
   * @param name - Player's full name
   * @returns Normalized player identifier
   */
  private generatePlayerIdFromName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}