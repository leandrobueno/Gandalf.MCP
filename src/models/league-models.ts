export interface ILeagueService {
  getUserLeagues(username: string, season?: string): Promise<UserLeaguesResult>;
  getLeagueDetails(leagueId: string): Promise<LeagueDetails | null>;
  getMatchups(leagueId: string, week?: number): Promise<MatchupsResult>;
  getLeagueTransactions(leagueId: string, week?: number): Promise<TransactionsResult>;
}

export interface UserLeaguesResult {
  user: UserSummary;
  season: string;
  totalLeagues: number;
  leagues: LeagueSummary[];
}

export interface UserSummary {
  userId: string;
  username: string;
  displayName?: string;
}

export interface LeagueSummary {
  leagueId: string;
  name: string;
  season: string;
  status: string;
  totalRosters: number;
  scoringType: string;
  draftStatus: string;
}

export interface LeagueDetails {
  leagueId: string;
  name: string;
  season: string;
  seasonType: string;
  status: string;
  totalRosters: number;
  sport: string;
  rosterPositions?: string[];
  scoringSettings?: Record<string, number>;
  settings?: any;
  scoringType: string;
}

export interface MatchupsResult {
  leagueId: string;
  week: number;
  totalMatchups: number;
  matchups: MatchupDetails[];
}

export interface MatchupDetails {
  matchupId: number;
  teams: TeamMatchup[];
}

export interface TeamMatchup {
  rosterId: number;
  points: number;
  starters?: string[];
  players?: string[];
  playersPoints?: Record<string, number>;
}

export interface TransactionsResult {
  leagueId: string;
  week: number;
  totalTransactions: number;
  transactions: TransactionDetails[];
}

export interface TransactionDetails {
  transactionId: string;
  type: string;
  status: string;
  week: number;
  rosterIds?: number[];
  adds?: Record<string, number>;
  drops?: Record<string, number>;
  created: string;
}