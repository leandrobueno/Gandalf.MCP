import { 
  FantasyProResponse, 
  PlayerRankings, 
  ExpertOpinion,
  PlayerTrends 
} from '../models/player-intelligence-models.js';

export interface IFantasyProClient {
  getConsensusRankings(position?: string, scoringFormat?: 'standard' | 'ppr' | 'half-ppr'): Promise<PlayerRankings[]>;
  getExpertOpinions(playerId: string): Promise<ExpertOpinion[]>;
  getPlayerTrends(playerId: string): Promise<PlayerTrends | null>;
  getADP(position?: string): Promise<{ playerId: string; adp: number; }[]>;
}

export class FantasyProClient implements IFantasyProClient {
  private readonly baseUrl = 'https://www.fantasypros.com/nfl';

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

  private parseRankingsFromHtml(html: string, scoringFormat: string): Array<{position: string; tier: number; adp: number}> {
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

  private extractPosition(text: string): string {
    const positionMatch = /\b(QB|RB|WR|TE|K|DST)\b/i.exec(text);
    return positionMatch ? positionMatch[1].toUpperCase() : '';
  }

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

  private generatePlayerIdFromName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}