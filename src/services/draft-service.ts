import { ISleeperApiClient } from './sleeper-api-client.js';
import { ICacheService } from './cache-service.js';
import { IPlayerIntelligenceService, PlayerIntelligenceOptions } from '../models/player-intelligence-models.js';
import { SleeperDraft, SleeperDraftPick } from '../models/sleeper-models.js';
import { 
  IDraftService, 
  DraftInfo, 
  DraftInformation, 
  DraftPick, 
  SeasonOptions, 
  DraftPicksOptions, 
  DraftPicksResult, 
  DraftPlayerOptions, 
  DraftPlayerResult, 
  DraftPlayer 
} from '../models/draft-models.js';


export class DraftService implements IDraftService {
  constructor(
    private sleeperClient: ISleeperApiClient,
    private cacheService: ICacheService,
    private playerIntelligenceService?: IPlayerIntelligenceService
  ) {}

  private filterDraftsBySeason(drafts: SleeperDraft[], seasonOptions: SeasonOptions): SleeperDraft[] {
    const { season, seasonStart, seasonEnd, seasonCount } = seasonOptions;
    
    // Priority 1: Single season
    if (season) {
      const targetYear = parseInt(season);
      return drafts.filter(draft => {
        const draftYear = new Date(draft.created * 1000).getFullYear();
        return draftYear === targetYear;
      });
    }
    
    // Priority 2: Season range
    if (seasonStart && seasonEnd) {
      const startYear = parseInt(seasonStart);
      const endYear = parseInt(seasonEnd);
      return drafts.filter(draft => {
        const draftYear = new Date(draft.created * 1000).getFullYear();
        return draftYear >= startYear && draftYear <= endYear;
      });
    }
    
    // Priority 3: Last N seasons
    if (seasonCount) {
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - seasonCount + 1;
      return drafts.filter(draft => {
        const draftYear = new Date(draft.created * 1000).getFullYear();
        return draftYear >= startYear && draftYear <= currentYear;
      });
    }
    
    // No filtering - return all drafts
    return drafts;
  }

  async getLeagueDraft(leagueId: string): Promise<DraftInfo> {
    // Get drafts for the league
    const drafts = await this.sleeperClient.getLeagueDrafts(leagueId);
    
    if (drafts.length === 0) {
      throw new Error(`No drafts found for league ${leagueId}`);
    }

    // Get the most recent draft
    const draft = drafts[0];
    
    // Get draft picks
    const picks = await this.sleeperClient.getDraftPicks(draft.draft_id);

    return {
      draftId: draft.draft_id,
      leagueId: draft.league_id,
      status: draft.status,
      type: draft.type,
      settings: draft.settings,
      created: new Date(draft.created).toISOString(),
      startTime: draft.start_time ? new Date(draft.start_time).toISOString() : null,
      metadata: draft.metadata,
      totalPicks: picks.length,
      picks: picks.map(pick => ({
        round: pick.round,
        pickNo: pick.pick_no,
        draftSlot: pick.draft_slot,
        playerId: pick.player_id,
        pickedBy: pick.picked_by,
        rosterId: pick.roster_id,
        isKeeper: pick.is_keeper,
        metadata: pick.metadata
      }))
    };
  }

  async getDraftAvailablePlayers(draftId: string, options: DraftPlayerOptions = {}): Promise<DraftPlayerResult> {
    const { position, team, query, maxResults = 50, includeIntelligence = false, scoringFormat = 'ppr' } = options;

    // Get all players from cache (using same caching strategy as player tools)
    const cacheKey = `players_nfl_${new Date().toISOString().split('T')[0]}`;
    const allPlayers = await this.cacheService.getOrSet(
      cacheKey,
      () => this.sleeperClient.getAllPlayers(),
      24 * 60 * 60 // 24 hours
    );

    // Get draft picks to determine which players are already drafted
    const draftPicks = await this.sleeperClient.getDraftPicks(draftId);
    const draftedPlayerIds = new Set(draftPicks.map(pick => pick.player_id).filter(Boolean));

    // Filter to get available players
    let availablePlayers = Object.values(allPlayers)
      .filter(p => 
        p.status === 'Active' && // Only active players
        p.search_rank && p.search_rank < 9999999 && // Only fantasy-relevant players
        !draftedPlayerIds.has(p.player_id) // Not already drafted
      );

    // Apply filters
    if (position) {
      availablePlayers = availablePlayers.filter(p => 
        p.position === position.toUpperCase() ||
        p.fantasy_positions?.includes(position.toUpperCase())
      );
    }

    if (team) {
      availablePlayers = availablePlayers.filter(p => p.team === team.toUpperCase());
    }

    if (query) {
      const searchTerm = query.toLowerCase();
      availablePlayers = availablePlayers.filter(p => 
        p.full_name?.toLowerCase().includes(searchTerm) ||
        p.first_name?.toLowerCase().includes(searchTerm) ||
        p.last_name?.toLowerCase().includes(searchTerm) ||
        p.team?.toLowerCase().includes(searchTerm)
      );
    }

    // ALWAYS sort by search_rank (Sleeper's fantasy rankings) - lower is better
    availablePlayers = availablePlayers
      .sort((a, b) => (a.search_rank || 9999999) - (b.search_rank || 9999999))
      .slice(0, maxResults);

    // Build enhanced player data
    const formattedPlayers: DraftPlayer[] = await Promise.all(
      availablePlayers.map(async (p) => {
        const basePlayer: DraftPlayer = {
          playerId: p.player_id,
          fullName: p.full_name || `${p.first_name} ${p.last_name}`,
          position: p.position,
          team: p.team,
          fantasyPositions: p.fantasy_positions,
          age: p.age,
          yearsExp: p.years_exp,
          injuryStatus: p.injury_status,
          searchRank: p.search_rank,
          depthChartOrder: p.depth_chart_order,
          depthChartPosition: p.depth_chart_position
        };

        // Add intelligence data if requested and service is available
        if (includeIntelligence && this.playerIntelligenceService) {
          try {
            const intelligenceOptions: PlayerIntelligenceOptions = {
              includeRankings: true,
              includeNews: true,
              includeExpertOpinions: true,
              includeDraftContext: true,
              newsLimit: 3,
              scoringFormat
            };

            const enhancedInfo = await this.playerIntelligenceService.getEnhancedPlayerInfo(
              p.player_id, 
              intelligenceOptions
            );

            if (enhancedInfo) {
              basePlayer.intelligence = {
                rankings: enhancedInfo.intelligence.rankings.map(r => ({
                  source: r.source,
                  rank: r.rank,
                  tier: r.tier,
                  adp: r.adp
                })),
                recentNews: enhancedInfo.intelligence.news.slice(0, 3).map(n => ({
                  headline: n.headline,
                  impact: n.impact,
                  publishedAt: n.publishedAt
                })),
                expertOpinions: enhancedInfo.intelligence.expertOpinions.slice(0, 2).map(o => ({
                  expert: o.expert,
                  recommendation: o.recommendation,
                  confidence: o.confidence
                })),
                draftContext: enhancedInfo.intelligence.draftContext ? {
                  adp: enhancedInfo.intelligence.draftContext.adp,
                  recommendationScore: enhancedInfo.intelligence.draftContext.recommendationScore,
                  value: enhancedInfo.intelligence.draftContext.value
                } : undefined
              };
            }
          } catch (error) {
            console.warn(`Failed to get intelligence for player ${p.player_id}:`, error);
          }
        }

        return basePlayer;
      })
    );

    return {
      draftId,
      totalDraftedPlayers: draftedPlayerIds.size,
      availablePlayers: formattedPlayers,
      filters: {
        position: position || undefined,
        team: team || undefined,
        query: query || undefined
      }
    };
  }

  async getLeagueDraftInformation(leagueId: string, seasonOptions: SeasonOptions = {}): Promise<DraftInformation> {
    // Get drafts for the league
    const drafts = await this.sleeperClient.getLeagueDrafts(leagueId);
    
    if (drafts.length === 0) {
      throw new Error(`No drafts found for league ${leagueId}`);
    }

    // Filter by season options
    const filteredDrafts = this.filterDraftsBySeason(drafts, seasonOptions);
    
    if (filteredDrafts.length === 0) {
      const filterDesc = seasonOptions.season ? `season ${seasonOptions.season}` :
        seasonOptions.seasonStart && seasonOptions.seasonEnd ? `seasons ${seasonOptions.seasonStart}-${seasonOptions.seasonEnd}` :
        seasonOptions.seasonCount ? `last ${seasonOptions.seasonCount} seasons` : 'specified criteria';
      throw new Error(`No drafts found for league ${leagueId} matching ${filterDesc}`);
    }

    // Get the most recent draft (or filtered draft)
    const draft = filteredDrafts[0];
    
    // Get draft picks to get total count
    const picks = await this.sleeperClient.getDraftPicks(draft.draft_id);

    return {
      draftId: draft.draft_id,
      leagueId: draft.league_id,
      status: draft.status,
      type: draft.type,
      settings: draft.settings,
      created: new Date(draft.created).toISOString(),
      startTime: draft.start_time ? new Date(draft.start_time).toISOString() : null,
      metadata: draft.metadata,
      totalPicks: picks.length,
      totalRounds: draft.settings?.rounds || 0,
      totalTeams: draft.settings?.teams || 0
    };
  }

  async getLeagueDraftPicks(leagueId: string, options: DraftPicksOptions = {}): Promise<DraftPicksResult> {
    const { season, seasonStart, seasonEnd, seasonCount, playerId, round, rosterId, pickedBy } = options;

    // Get drafts for the league
    const drafts = await this.sleeperClient.getLeagueDrafts(leagueId);
    
    if (drafts.length === 0) {
      throw new Error(`No drafts found for league ${leagueId}`);
    }

    // Filter by season options
    const seasonOptions = { season, seasonStart, seasonEnd, seasonCount };
    const filteredDrafts = this.filterDraftsBySeason(drafts, seasonOptions);
    
    if (filteredDrafts.length === 0) {
      const filterDesc = season ? `season ${season}` :
        seasonStart && seasonEnd ? `seasons ${seasonStart}-${seasonEnd}` :
        seasonCount ? `last ${seasonCount} seasons` : 'specified criteria';
      throw new Error(`No drafts found for league ${leagueId} matching ${filterDesc}`);
    }

    // For multiple drafts, collect picks from all filtered drafts
    const allPicks: SleeperDraftPick[] = [];
    for (const draft of filteredDrafts) {
      const draftPicks = await this.sleeperClient.getDraftPicks(draft.draft_id);
      allPicks.push(...draftPicks);
    }

    // Apply filters
    let filteredPicks = allPicks;

    if (playerId) {
      filteredPicks = filteredPicks.filter(pick => pick.player_id === playerId);
    }

    if (round !== undefined) {
      filteredPicks = filteredPicks.filter(pick => pick.round === round);
    }

    if (rosterId !== undefined) {
      filteredPicks = filteredPicks.filter(pick => pick.roster_id === rosterId);
    }

    if (pickedBy) {
      filteredPicks = filteredPicks.filter(pick => pick.picked_by === pickedBy);
    }

    const mappedPicks: DraftPick[] = filteredPicks.map(pick => ({
      round: pick.round,
      pickNo: pick.pick_no,
      draftSlot: pick.draft_slot,
      playerId: pick.player_id,
      pickedBy: pick.picked_by,
      rosterId: pick.roster_id,
      isKeeper: pick.is_keeper,
      metadata: pick.metadata
    }));

    return {
      draftId: filteredDrafts.length === 1 ? filteredDrafts[0].draft_id : `${filteredDrafts.length} drafts`,
      leagueId: leagueId,
      totalPicks: allPicks.length,
      filteredPicks: mappedPicks.length,
      picks: mappedPicks,
      filters: Object.keys(options).length > 0 ? options : undefined
    };
  }

  // Future methods can be added here for extended draft functionality:
  // - getDraftRecommendations()
  // - analyzeDraftStrategy() 
  // - getPositionalNeeds()
  // - calculatePlayerValue()
  // - etc.
}