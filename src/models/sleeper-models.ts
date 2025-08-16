/**
 * @fileoverview Sleeper API response models and interfaces for fantasy football platform integration.
 * Contains models for users, leagues, rosters, matchups, transactions, players, drafts, and NFL state data.
 */

/**
 * Represents a Sleeper platform user.
 * Used for identifying league owners and participants.
 */
export interface SleeperUser {
  /** Unique identifier for the user in Sleeper's system */
  user_id: string;
  /** User's chosen username/handle */
  username: string;
  /** User's display name (may differ from username) */
  display_name: string;
  /** Optional avatar identifier for user's profile picture */
  avatar?: string;
}

/**
 * Represents a fantasy football league on the Sleeper platform.
 * Contains league configuration, scoring settings, and roster requirements.
 */
export interface SleeperLeague {
  /** Unique identifier for the league */
  league_id: string;
  /** Human-readable name of the league */
  name: string;
  /** The NFL season year (e.g., "2024") */
  season: string;
  /** Type of season ("regular", "post", "off") */
  season_type: string;
  /** Total number of teams/rosters in the league */
  total_rosters: number;
  /** Current status of the league ("pre_draft", "drafting", "in_season", "complete") */
  status: string;
  /** Sport type, typically "nfl" for NFL fantasy */
  sport: string;
  /** Scoring configuration with stat categories and point values */
  scoring_settings?: Record<string, number>;
  /** Required roster position slots (e.g., ["QB", "RB", "RB", "WR"]) */
  roster_positions?: string[];
  /** Additional league configuration settings */
  settings?: LeagueSettings;
}

/**
 * Configuration settings for a Sleeper league.
 * Defines rules for keepers, draft, trades, playoffs, and waivers.
 */
export interface LeagueSettings {
  /** Maximum number of players that can be kept from previous season */
  max_keepers: number;
  /** Total number of rounds in the draft */
  draft_rounds: number;
  /** Week number when trade deadline occurs */
  trade_deadline: number;
  /** Week number when playoffs begin */
  playoff_week_start: number;
  /** Type of waiver system (0=None, 1=Free Agency, 2=Waivers) */
  waiver_type: number;
  /** Day of week when waivers process (0=Sunday, 1=Monday, etc.) */
  waiver_day_of_week: number;
}

/**
 * Represents a team roster within a Sleeper league.
 * Contains player assignments and roster configuration.
 */
export interface SleeperRoster {
  /** Unique identifier for this roster within the league */
  roster_id: number;
  /** User ID of the roster owner (null for orphaned teams) */
  owner_id?: string;
  /** League this roster belongs to */
  league_id: string;
  /** Array of all player IDs on this roster */
  players?: string[];
  /** Array of player IDs in starting lineup */
  starters?: string[];
  /** Array of player IDs on injured reserve */
  reserve?: string[];
  /** Array of player IDs on taxi squad (for dynasty leagues) */
  taxi?: string[];
  /** Roster performance statistics and settings */
  settings?: RosterSettings;
}

/**
 * Performance statistics and settings for a roster.
 * Tracks wins/losses and fantasy points scored/allowed.
 */
export interface RosterSettings {
  /** Total wins for the season */
  wins: number;
  /** Total losses for the season */
  losses: number;
  /** Total ties for the season */
  ties: number;
  /** Total fantasy points scored (integer portion) */
  fpts?: number;
  /** Decimal portion of fantasy points scored */
  fpts_decimal?: number;
  /** Total fantasy points scored against this roster (integer portion) */
  fpts_against?: number;
  /** Decimal portion of fantasy points scored against this roster */
  fpts_against_decimal?: number;
}

/**
 * Represents one team's performance in a weekly matchup.
 * Contains scoring data and player performance details.
 */
export interface SleeperMatchup {
  /** ID of the roster/team in this matchup */
  roster_id: number;
  /** Identifier linking opposing teams in the same matchup */
  matchup_id: number;
  /** Total fantasy points scored by this roster */
  points: number;
  /** Array of all player IDs on the roster for this week */
  players?: string[];
  /** Array of player IDs in the starting lineup */
  starters?: string[];
  /** Map of player ID to fantasy points scored */
  players_points?: Record<string, number>;
}

/**
 * Represents a roster transaction (add, drop, trade, waiver claim).
 * Tracks all player movement within the league.
 */
export interface SleeperTransaction {
  /** Unique identifier for this transaction */
  transaction_id: string;
  /** Type of transaction ("free_agent", "trade", "waiver") */
  type: string;
  /** Current status ("complete", "pending", "failed") */
  status: string;
  /** Week number when transaction occurred */
  week: number;
  /** Array of roster IDs involved in the transaction */
  roster_ids?: number[];
  /** Map of player ID to receiving roster ID for additions */
  adds?: Record<string, number>;
  /** Map of player ID to dropping roster ID for releases */
  drops?: Record<string, number>;
  /** Unix timestamp when transaction was created */
  created: number;
}

/**
 * Represents an NFL player in the Sleeper database.
 * Contains biographical info, team assignment, and fantasy relevance data.
 */
export interface SleeperPlayer {
  /** Unique identifier for the player in Sleeper's system */
  player_id: string;
  /** Player's first name */
  first_name?: string;
  /** Player's last name */
  last_name?: string;
  /** Player's full name (first + last) */
  full_name?: string;
  /** Current NFL team abbreviation (e.g., "SEA", "NE") */
  team?: string;
  /** Primary position (e.g., "QB", "RB", "WR") */
  position?: string;
  /** Array of eligible fantasy positions for this player */
  fantasy_positions?: string[];
  /** Player's age in years */
  age?: number;
  /** Number of years of NFL experience */
  years_exp?: number;
  /** Player status ("Active", "Inactive", "PracticeSquad") */
  status?: string;
  /** Current injury designation ("Questionable", "Doubtful", "Out", "IR") */
  injury_status?: string;
  /** Player's jersey number */
  number?: number;
  /** Position on team's depth chart (1=starter, 2=backup, etc.) */
  depth_chart_order?: number;
  /** Specific depth chart position designation */
  depth_chart_position?: string;
  /** Search ranking/popularity in fantasy searches */
  search_rank?: number;
}

/**
 * Represents the current state of the NFL season.
 * Used to determine active week and season phase.
 */
export interface SleeperNFLState {
  /** Current NFL week number */
  week: number;
  /** Phase of season ("pre", "regular", "post", "off") */
  season_type: string;
  /** Current NFL season year */
  season: string;
  /** League season designation for fantasy purposes */
  league_season: string;
  /** Week number to display to users (may differ from actual week) */
  display_week: number;
}

/**
 * Represents a player trending in add/drop activity.
 * Used to identify popular waiver wire targets.
 */
export interface SleeperTrendingPlayer {
  /** Unique identifier for the trending player */
  player_id: string;
  /** Number of add/drop actions for this player in the time period */
  count: number;
}

/**
 * Represents a draft event for a Sleeper league.
 * Contains draft configuration, status, and order information.
 */
export interface SleeperDraft {
  /** Unique identifier for this draft */
  draft_id: string;
  /** League this draft belongs to */
  league_id: string;
  /** Current draft status ("pre_draft", "drafting", "complete") */
  status: string;
  /** Type of draft ("snake", "linear", "auction") */
  type: string;
  /** Map of user ID to draft position */
  draft_order?: Record<string, number>;
  /** Map of draft slot number to roster ID */
  slot_to_roster_id?: Record<string, number>;
  /** Draft configuration and rules */
  settings?: DraftSettings;
  /** Unix timestamp when draft was created */
  created: number;
  /** Unix timestamp when draft is scheduled to start */
  start_time?: number;
  /** Additional draft metadata and state */
  metadata?: DraftMetadata;
}

/**
 * Configuration settings for a draft.
 * Defines roster structure and timing rules.
 */
export interface DraftSettings {
  /** Total number of draft rounds */
  rounds: number;
  /** Number of teams participating in the draft */
  teams: number;
  /** Number of wide receiver roster slots */
  slots_wr?: number;
  /** Number of running back roster slots */
  slots_rb?: number;
  /** Number of quarterback roster slots */
  slots_qb?: number;
  /** Number of tight end roster slots */
  slots_te?: number;
  /** Number of flex (RB/WR/TE) roster slots */
  slots_flex?: number;
  /** Number of kicker roster slots */
  slots_k?: number;
  /** Number of defense/special teams roster slots */
  slots_def?: number;
  /** Number of bench roster slots */
  slots_bn?: number;
  /** Time limit per pick in seconds */
  pick_timer?: number;
}

/**
 * Additional metadata about draft state.
 * Contains real-time draft progress information.
 */
export interface DraftMetadata {
  /** Current pick number in the draft (1-indexed) */
  current_pick?: number;
}

/**
 * Represents a single pick in a draft.
 * Contains pick order, selected player, and selection details.
 */
export interface SleeperDraftPick {
  /** Draft this pick belongs to */
  draft_id: string;
  /** Round number (1-indexed) */
  round: number;
  /** Overall pick number (1-indexed) */
  pick_no: number;
  /** Draft position/slot of the team making this pick */
  draft_slot: number;
  /** ID of the selected player (null if pick not made) */
  player_id?: string;
  /** User ID of the person who made the pick */
  picked_by?: string;
  /** Roster ID that owns this pick */
  roster_id?: number;
  /** Whether this pick was used for a keeper player */
  is_keeper?: boolean;
  /** Additional information about the selected player */
  metadata?: DraftPickMetadata;
}

/**
 * Metadata about a drafted player.
 * Provides quick access to player details without additional API calls.
 */
export interface DraftPickMetadata {
  /** Drafted player's first name */
  first_name?: string;
  /** Drafted player's last name */
  last_name?: string;
  /** Drafted player's position */
  position?: string;
  /** Drafted player's NFL team */
  team?: string;
  /** Drafted player's unique identifier */
  player_id?: string;
}