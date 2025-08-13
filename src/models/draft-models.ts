export interface IDraftService {
  getLeagueDraft(leagueId: string): Promise<DraftInfo>;
  getLeagueDraftInformation(leagueId: string, seasonOptions?: SeasonOptions): Promise<DraftInformation>;
  getLeagueDraftPicks(leagueId: string, options?: DraftPicksOptions): Promise<DraftPicksResult>;
  getDraftAvailablePlayers(draftId: string, options?: DraftPlayerOptions): Promise<DraftPlayerResult>;
}

export interface DraftInfo {
  draftId: string;
  leagueId: string;
  status: string;
  type: string;
  settings?: any;
  created: string;
  startTime: string | null;
  metadata?: any;
  totalPicks: number;
  picks: DraftPick[];
}

export interface DraftInformation {
  draftId: string;
  leagueId: string;
  status: string;
  type: string;
  settings?: any;
  created: string;
  startTime: string | null;
  metadata?: any;
  totalPicks: number;
  totalRounds: number;
  totalTeams: number;
}

export interface DraftPick {
  round: number;
  pickNo: number;
  draftSlot: number;
  playerId?: string;
  pickedBy?: string;
  rosterId?: number;
  isKeeper?: boolean;
  metadata?: any;
}

export interface SeasonOptions {
  season?: string;
  seasonStart?: string;
  seasonEnd?: string;
  seasonCount?: number;
}

export interface DraftPicksOptions extends SeasonOptions {
  playerId?: string;
  round?: number;
  rosterId?: number;
  pickedBy?: string;
}

export interface DraftPicksResult {
  draftId: string;
  leagueId: string;
  totalPicks: number;
  filteredPicks: number;
  picks: DraftPick[];
  filters?: DraftPicksOptions;
}

export interface DraftPlayerOptions {
  position?: string;
  team?: string;
  query?: string;
  maxResults?: number;
}

export interface DraftPlayerResult {
  draftId: string;
  totalDraftedPlayers: number;
  availablePlayers: DraftPlayer[];
  filters?: {
    position?: string;
    team?: string;
    query?: string;
  };
}

export interface DraftPlayer {
  playerId: string;
  fullName: string;
  position?: string;
  team?: string;
  fantasyPositions?: string[];
  age?: number;
  yearsExp?: number;
  injuryStatus?: string;
  searchRank?: number;
  depthChartOrder?: number;
  depthChartPosition?: string;
}