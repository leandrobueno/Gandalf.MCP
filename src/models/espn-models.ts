export interface EspnInjuryReport {
  athlete?: EspnAthlete;
  team?: EspnTeam;
  status?: string;
  description?: string;
  date?: string;
}

export interface EspnAthlete {
  id?: string;
  displayName?: string;
  position?: EspnPosition;
  headshot?: EspnImage;
}

export interface EspnPosition {
  abbreviation?: string;
  displayName?: string;
}

export interface EspnTeam {
  id?: string;
  displayName?: string;
  abbreviation?: string;
  logo?: string;
}

export interface EspnImage {
  href?: string;
}

export interface EspnNewsItem {
  id: number;
  headline?: string;
  description?: string;
  published?: string;
  lastModified?: string;
  type?: string;
  byline?: string;
  premium: boolean;
  categories?: EspnCategory[];
  links?: EspnLinks;
}

export interface EspnCategory {
  id: number;
  description?: string;
  type?: string;
  sportId?: string;
  athlete?: EspnAthlete;
  team?: EspnTeam;
}

export interface EspnLinks {
  api?: EspnApiLinks;
  web?: EspnWebLinks;
}

export interface EspnApiLinks {
  news?: EspnLink;
}

export interface EspnWebLinks {
  href?: string;
}

export interface EspnLink {
  href?: string;
}

export interface EspnInjuryResponse {
  count: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  items?: EspnInjuryReport[];
}

export interface EspnNewsResponse {
  header?: string;
  articles?: EspnNewsItem[];
}