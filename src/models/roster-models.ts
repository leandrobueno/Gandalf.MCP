export interface IRosterService {
  getAllRosters(leagueId: string): Promise<AllRostersResult>;
  getRoster(leagueId: string, rosterIdOrUsername: string): Promise<RosterDetails | null>;
}

export interface AllRostersResult {
  league: LeagueInfo;
  totalRosters: number;
  rosters: RosterSummary[];
}

export interface LeagueInfo {
  leagueId: string;
  name: string;
  season: string;
  totalRosters: number;
}

export interface RosterSummary {
  rosterId: number;
  ownerId?: string;
  ownerUsername?: string;
  ownerDisplayName?: string;
  wins: number;
  losses: number;
  ties: number;
  totalPoints: number;
  pointsAgainst: number;
  playerCount: number;
  starterCount: number;
}

export interface RosterDetails {
  rosterId: number;
  owner?: OwnerDetails;
  record: RosterRecord;
  starters: PlayerInfo[];
  bench: PlayerInfo[];
  reserve: PlayerInfo[];
  taxi: PlayerInfo[];
}

export interface OwnerDetails {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

export interface RosterRecord {
  wins: number;
  losses: number;
  ties: number;
  totalPoints: number;
  pointsAgainst: number;
}

export interface PlayerInfo {
  playerId: string;
  fullName: string;
  position?: string;
  team?: string;
  injuryStatus?: string;
}