import { 
  PlayerNews, 
  InjuryReport,
  PlayerRankings 
} from '../models/player-intelligence-models.js';

export interface IESPNIntelligenceClient {
  getPlayerNews(playerId?: string, limit?: number): Promise<PlayerNews[]>;
  getInjuryReports(): Promise<InjuryReport[]>;
  getPlayerRankings(position?: string): Promise<PlayerRankings[]>;
}

export class ESPNIntelligenceClient implements IESPNIntelligenceClient {
  private readonly baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
  private readonly fantasyUrl = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl';

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

  private mapInjuryStatus(status: string): 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'pup' {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('out') || statusLower.includes('inactive')) {return 'out';}
    if (statusLower.includes('doubtful')) {return 'doubtful';}
    if (statusLower.includes('questionable')) {return 'questionable';}
    if (statusLower.includes('ir') || statusLower.includes('injured reserve')) {return 'ir';}
    if (statusLower.includes('pup')) {return 'pup';}
    
    return 'healthy';
  }

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