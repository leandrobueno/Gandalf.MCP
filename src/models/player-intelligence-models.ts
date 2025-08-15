export interface IPlayerIntelligenceService {
  getEnhancedPlayerInfo(playerId: string, options?: PlayerIntelligenceOptions): Promise<EnhancedPlayerInfo | null>;
  getPlayerRankings(position?: string): Promise<PlayerRankings[]>;
  getPlayerNews(playerId: string, limit?: number): Promise<PlayerNews[]>;
  getInjuryReports(playerId?: string): Promise<InjuryReport[]>;
  getExpertOpinions(playerId: string): Promise<ExpertOpinion[]>;
}

export interface EnhancedPlayerInfo {
  playerId: string;
  basicInfo: {
    fullName: string;
    position?: string;
    team?: string;
    age?: number;
    yearsExp?: number;
    injuryStatus?: string;
  };
  intelligence: PlayerIntelligence;
  lastUpdated: string;
}

export interface PlayerIntelligence {
  rankings: PlayerRankings[];
  projections: PlayerProjections;
  news: PlayerNews[];
  injuries: InjuryReport[];
  expertOpinions: ExpertOpinion[];
  trends: PlayerTrends;
  draftContext?: DraftContext;
}

export interface PlayerRankings {
  source: 'espn' | 'fantasypros' | 'sleeper' | 'consensus';
  position: string;
  rank: number;
  tier?: number;
  adp?: number;
  scoringFormat: 'standard' | 'ppr' | 'half-ppr';
  lastUpdated: string;
}

export interface PlayerProjections {
  source: string;
  passingYards?: number;
  passingTds?: number;
  rushingYards?: number;
  rushingTds?: number;
  receivingYards?: number;
  receivingTds?: number;
  receptions?: number;
  fantasyPoints?: number;
  scoringFormat: 'standard' | 'ppr' | 'half-ppr';
  weeklyProjection?: boolean;
  seasonProjection?: boolean;
}

export interface PlayerNews {
  headline: string;
  summary: string;
  source: string;
  impact: 'positive' | 'negative' | 'neutral';
  severity: 'low' | 'medium' | 'high';
  publishedAt: string;
  url?: string;
  tags?: string[];
}

export interface InjuryReport {
  playerId: string;
  injuryType: string;
  bodyPart: string;
  status: 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'pup';
  expectedReturn?: string;
  description: string;
  source: string;
  reportedAt: string;
  lastUpdated: string;
}

export interface ExpertOpinion {
  expert: string;
  source: string;
  opinion: string;
  recommendation: 'buy' | 'hold' | 'sell' | 'avoid';
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  publishedAt: string;
}

export interface PlayerTrends {
  adpTrend: {
    direction: 'rising' | 'falling' | 'stable';
    change: number;
    timeframe: '24h' | '7d' | '30d';
  };
  ownershipTrend: {
    percentOwned: number;
    change: number;
    timeframe: '24h' | '7d';
  };
  searchTrend: {
    volume: 'low' | 'medium' | 'high' | 'trending';
    change: number;
  };
}

export interface DraftContext {
  adp: number;
  recommendationScore: number;
  positionRank: number;
  tier: number;
  value: 'reach' | 'fair' | 'value' | 'steal';
  bestRound?: number;
  worstRound?: number;
}

export interface PlayerIntelligenceOptions {
  includeRankings?: boolean;
  includeProjections?: boolean;
  includeNews?: boolean;
  includeInjuries?: boolean;
  includeExpertOpinions?: boolean;
  includeTrends?: boolean;
  includeDraftContext?: boolean;
  newsLimit?: number;
  scoringFormat?: 'standard' | 'ppr' | 'half-ppr';
}

export interface ESPNPlayerResponse {
  id: string;
  fullName: string;
  defaultPositionId: number;
  proTeamId: number;
  stats?: any[];
  injured?: boolean;
  injuryStatus?: string;
}

export interface ESPNNewsResponse {
  headlines: Array<{
    headline: string;
    description: string;
    published: string;
    source: string;
    type: string;
  }>;
}

export interface FantasyProResponse {
  players: Array<{
    player_name: string;
    player_id: string;
    pos_rank: number;
    tier: number;
    adp: number;
  }>;
}