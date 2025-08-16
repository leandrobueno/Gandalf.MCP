/**
 * @fileoverview ESPN API response models for sports data integration.
 * Contains models for injury reports, news articles, athlete information, and team data.
 */

/**
 * ESPN injury report data structure.
 * Contains information about player injuries from ESPN's injury report system.
 */
export interface EspnInjuryReport {
  /** Information about the injured athlete */
  athlete?: EspnAthlete;
  /** Team the athlete belongs to */
  team?: EspnTeam;
  /** Current injury status (e.g., "Out", "Questionable") */
  status?: string;
  /** Detailed description of the injury */
  description?: string;
  /** Date the injury was reported or updated */
  date?: string;
}

/**
 * ESPN athlete/player information.
 * Represents a sports player in ESPN's data model.
 */
export interface EspnAthlete {
  /** Unique ESPN identifier for the athlete */
  id?: string;
  /** Athlete's display name */
  displayName?: string;
  /** Position information for the athlete */
  position?: EspnPosition;
  /** Player headshot image information */
  headshot?: EspnImage;
}

/**
 * ESPN position information for athletes.
 * Contains both abbreviated and full position names.
 */
export interface EspnPosition {
  /** Position abbreviation (e.g., "QB", "RB") */
  abbreviation?: string;
  /** Full position name (e.g., "Quarterback", "Running Back") */
  displayName?: string;
}

/**
 * ESPN team information.
 * Contains team identification and branding data.
 */
export interface EspnTeam {
  /** Unique ESPN identifier for the team */
  id?: string;
  /** Full team name */
  displayName?: string;
  /** Team abbreviation (e.g., "SEA", "NE") */
  abbreviation?: string;
  /** URL to team logo image */
  logo?: string;
}

/**
 * ESPN image reference.
 * Simple wrapper for image URLs in ESPN responses.
 */
export interface EspnImage {
  /** URL to the image */
  href?: string;
}

/**
 * ESPN news article or story item.
 * Represents a single news piece from ESPN's content system.
 */
export interface EspnNewsItem {
  /** Unique identifier for the news item */
  id: number;
  /** Article headline/title */
  headline?: string;
  /** Article summary or description */
  description?: string;
  /** Publication date/time */
  published?: string;
  /** Last modification date/time */
  lastModified?: string;
  /** Type of content (article, video, etc.) */
  type?: string;
  /** Author information */
  byline?: string;
  /** Whether this is premium/subscription content */
  premium: boolean;
  /** Content categorization and tags */
  categories?: EspnCategory[];
  /** Related links and references */
  links?: EspnLinks;
}

/**
 * ESPN content category and tagging information.
 * Used to categorize news items and associate them with entities.
 */
export interface EspnCategory {
  /** Unique identifier for the category */
  id: number;
  /** Category description or name */
  description?: string;
  /** Type of category */
  type?: string;
  /** Associated sport identifier */
  sportId?: string;
  /** Associated athlete if category relates to specific player */
  athlete?: EspnAthlete;
  /** Associated team if category relates to specific team */
  team?: EspnTeam;
}

/**
 * ESPN link references for content.
 * Contains both API and web link references.
 */
export interface EspnLinks {
  /** API-related links */
  api?: EspnApiLinks;
  /** Web/browser links */
  web?: EspnWebLinks;
}

/**
 * ESPN API link references.
 * Contains links to related API endpoints.
 */
export interface EspnApiLinks {
  /** Link to news API endpoint */
  news?: EspnLink;
}

/**
 * ESPN web link references.
 * Contains links to web pages and resources.
 */
export interface EspnWebLinks {
  /** URL to web resource */
  href?: string;
}

/**
 * Generic ESPN link structure.
 * Standard format for URLs in ESPN responses.
 */
export interface EspnLink {
  /** URL to the linked resource */
  href?: string;
}

/**
 * ESPN injury report API response.
 * Paginated response containing multiple injury reports.
 */
export interface EspnInjuryResponse {
  /** Total number of injury reports in the result set */
  count: number;
  /** Current page index (0-based) */
  pageIndex: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of pages available */
  pageCount: number;
  /** Array of injury reports for the current page */
  items?: EspnInjuryReport[];
}

/**
 * ESPN news API response.
 * Contains news articles and optional header information.
 */
export interface EspnNewsResponse {
  /** Optional header text for the news feed */
  header?: string;
  /** Array of news articles */
  articles?: EspnNewsItem[];
}