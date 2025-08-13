export interface IPlayerService {
  searchPlayers(options?: PlayerSearchOptions): Promise<PlayerSearchResult>;
  getPlayer(playerIdOrName: string): Promise<PlayerDetails | null>;
  getTrendingPlayers(options?: TrendingPlayerOptions): Promise<TrendingPlayerResult>;
}

export interface PlayerSearchOptions {
  query?: string;
  position?: string;
  team?: string;
  maxResults?: number;
}

export interface PlayerSearchResult {
  totalFound: number;
  players: PlayerSummary[];
  filters?: {
    query?: string;
    position?: string;
    team?: string;
  };
}

export interface PlayerSummary {
  playerId: string;
  fullName: string;
  position?: string;
  team?: string;
  fantasyPositions?: string[];
  age?: number;
  yearsExp?: number;
  injuryStatus?: string;
  searchRank?: number;
}

export interface PlayerDetails {
  playerId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  team?: string;
  fantasyPositions?: string[];
  age?: number;
  yearsExp?: number;
  status?: string;
  injuryStatus?: string;
  number?: number;
  depthChartOrder?: number;
  depthChartPosition?: string;
  searchRank?: number;
}

export interface TrendingPlayerOptions {
  type?: 'add' | 'drop';
  hours?: number;
  limit?: number;
}

export interface TrendingPlayerResult {
  type: 'add' | 'drop';
  hours: number;
  totalCount: number;
  players: TrendingPlayer[];
}

export interface TrendingPlayer {
  playerId: string;
  count: number;
  fullName?: string;
  position?: string;
  team?: string;
  injuryStatus?: string;
}