export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar?: string;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  season_type: string;
  total_rosters: number;
  status: string;
  sport: string;
  scoring_settings?: Record<string, number>;
  roster_positions?: string[];
  settings?: LeagueSettings;
}

export interface LeagueSettings {
  max_keepers: number;
  draft_rounds: number;
  trade_deadline: number;
  playoff_week_start: number;
  waiver_type: number;
  waiver_day_of_week: number;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id?: string;
  league_id: string;
  players?: string[];
  starters?: string[];
  reserve?: string[];
  taxi?: string[];
  settings?: RosterSettings;
}

export interface RosterSettings {
  wins: number;
  losses: number;
  ties: number;
  fpts?: number;
  fpts_decimal?: number;
  fpts_against?: number;
  fpts_against_decimal?: number;
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  players?: string[];
  starters?: string[];
  players_points?: Record<string, number>;
}

export interface SleeperTransaction {
  transaction_id: string;
  type: string;
  status: string;
  week: number;
  roster_ids?: number[];
  adds?: Record<string, number>;
  drops?: Record<string, number>;
  created: number;
}

export interface SleeperPlayer {
  player_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  team?: string;
  position?: string;
  fantasy_positions?: string[];
  age?: number;
  years_exp?: number;
  status?: string;
  injury_status?: string;
  number?: number;
  depth_chart_order?: number;
  depth_chart_position?: string;
  search_rank?: number;
}

export interface SleeperNFLState {
  week: number;
  season_type: string;
  season: string;
  league_season: string;
  display_week: number;
}

export interface SleeperTrendingPlayer {
  player_id: string;
  count: number;
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string;
  status: string;
  type: string;
  draft_order?: Record<string, number>;
  slot_to_roster_id?: Record<string, number>;
  settings?: DraftSettings;
  created: number;
  start_time?: number;
  metadata?: DraftMetadata;
}

export interface DraftSettings {
  rounds: number;
  teams: number;
  slots_wr?: number;
  slots_rb?: number;
  slots_qb?: number;
  slots_te?: number;
  slots_flex?: number;
  slots_k?: number;
  slots_def?: number;
  slots_bn?: number;
  pick_timer?: number;
}

export interface DraftMetadata {
  current_pick?: number;
}

export interface SleeperDraftPick {
  draft_id: string;
  round: number;
  pick_no: number;
  draft_slot: number;
  player_id?: string;
  picked_by?: string;
  roster_id?: number;
  is_keeper?: boolean;
  metadata?: DraftPickMetadata;
}

export interface DraftPickMetadata {
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
  player_id?: string;
}