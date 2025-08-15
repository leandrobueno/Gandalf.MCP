import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IDraftService } from '../models/draft-models.js';

export class DraftTools {
  constructor(
    private draftService: IDraftService
  ) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_league_draft_information',
        description: 'Get basic draft information for a league (without picks data)',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: {
              type: 'string',
              description: 'The league ID'
            },
            season: {
              type: 'string',
              description: 'Optional specific season/year (e.g., "2024", "2023"). Takes precedence over range parameters.',
              default: null
            },
            seasonStart: {
              type: 'string',
              description: 'Optional start year for season range (e.g., "2020"). Used with seasonEnd.',
              default: null
            },
            seasonEnd: {
              type: 'string',
              description: 'Optional end year for season range (e.g., "2024"). Used with seasonStart.',
              default: null
            },
            seasonCount: {
              type: 'integer',
              description: 'Optional number of recent seasons to include (e.g., 5 for last 5 seasons).',
              default: null
            }
          },
          required: ['leagueId']
        }
      },
      {
        name: 'get_league_draft_picks',
        description: 'Get draft picks for a league with optional filtering by player, round, roster, or picker',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: {
              type: 'string',
              description: 'The league ID'
            },
            season: {
              type: 'string',
              description: 'Optional specific season/year (e.g., "2024", "2023"). Takes precedence over range parameters.',
              default: null
            },
            seasonStart: {
              type: 'string',
              description: 'Optional start year for season range (e.g., "2020"). Used with seasonEnd.',
              default: null
            },
            seasonEnd: {
              type: 'string',
              description: 'Optional end year for season range (e.g., "2024"). Used with seasonStart.',
              default: null
            },
            seasonCount: {
              type: 'integer',
              description: 'Optional number of recent seasons to include (e.g., 5 for last 5 seasons).',
              default: null
            },
            playerId: {
              type: 'string',
              description: 'Filter picks for a specific player ID',
              default: null
            },
            round: {
              type: 'integer',
              description: 'Filter picks for a specific round number',
              default: null
            },
            rosterId: {
              type: 'integer',
              description: 'Filter picks for a specific roster/team ID',
              default: null
            },
            pickedBy: {
              type: 'string',
              description: 'Filter picks by who made the pick (user ID)',
              default: null
            }
          },
          required: ['leagueId']
        }
      },
      {
        name: 'get_draft_available_players',
        description: 'Get available (undrafted) players for a specific draft, ranked by Sleeper\'s fantasy rankings',
        inputSchema: {
          type: 'object',
          properties: {
            draftId: {
              type: 'string',
              description: 'The draft ID'
            },
            position: {
              type: 'string',
              description: 'Filter by position (QB, RB, WR, TE, K, DEF)',
              default: null
            },
            team: {
              type: 'string',
              description: 'Filter by team (use team abbreviation like KC, BUF, etc.)',
              default: null
            },
            query: {
              type: 'string',
              description: 'Search query for player names',
              default: null
            },
            maxResults: {
              type: 'integer',
              description: 'Maximum number of results to return (default 50)',
              default: 50
            },
            includeIntelligence: {
              type: 'boolean',
              description: 'Include enhanced player intelligence data (rankings, news, expert opinions)',
              default: false
            },
            scoringFormat: {
              type: 'string',
              description: 'Scoring format for rankings (standard, ppr, half-ppr)',
              default: 'ppr'
            }
          },
          required: ['draftId']
        }
      }
    ];
  }

  canHandle(toolName: string): boolean {
    return [
      'get_league_draft_information',
      'get_league_draft_picks',
      'get_draft_available_players'
    ].includes(toolName);
  }

  async handleTool(name: string, args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
      case 'get_league_draft_information':
        return this.getLeagueDraftInformation(
          args.leagueId,
          args.season,
          args.seasonStart,
          args.seasonEnd,
          args.seasonCount
        );
      
      case 'get_league_draft_picks':
        return this.getLeagueDraftPicks(
          args.leagueId,
          args.season,
          args.seasonStart,
          args.seasonEnd,
          args.seasonCount,
          args.playerId,
          args.round,
          args.rosterId,
          args.pickedBy
        );
      
      case 'get_draft_available_players':
        return this.getDraftAvailablePlayers(
          args.draftId,
          args.position,
          args.team,
          args.query,
          args.maxResults || 50,
          args.includeIntelligence || false,
          args.scoringFormat || 'ppr'
        );
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getLeagueDraftInformation(
    leagueId: string,
    season?: string,
    seasonStart?: string,
    seasonEnd?: string,
    seasonCount?: number
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const draftInfo = await this.draftService.getLeagueDraftInformation(leagueId, {
        season,
        seasonStart,
        seasonEnd,
        seasonCount
      });
      const seasonDesc = season ? ` (${season})` :
        seasonStart && seasonEnd ? ` (${seasonStart}-${seasonEnd})` :
        seasonCount ? ` (last ${seasonCount} seasons)` : '';
      const summary = `Draft information for league ${leagueId}${seasonDesc} - ${draftInfo.status} (${draftInfo.totalPicks} total picks, ${draftInfo.totalRounds} rounds, ${draftInfo.totalTeams} teams)`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              summary,
              data: draftInfo
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }
        ]
      };
    }
  }

  private async getLeagueDraftPicks(
    leagueId: string,
    season?: string,
    seasonStart?: string,
    seasonEnd?: string,
    seasonCount?: number,
    playerId?: string,
    round?: number,
    rosterId?: number,
    pickedBy?: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.draftService.getLeagueDraftPicks(leagueId, {
        season,
        seasonStart,
        seasonEnd,
        seasonCount,
        playerId,
        round,
        rosterId,
        pickedBy
      });

      const seasonFilter = season ? `Season: ${season}` :
        seasonStart && seasonEnd ? `Seasons: ${seasonStart}-${seasonEnd}` :
        seasonCount ? `Last ${seasonCount} seasons` : null;
      
      const filterSummary = [
        seasonFilter,
        playerId && `Player: ${playerId}`,
        round !== undefined && `Round: ${round}`,
        rosterId !== undefined && `Roster: ${rosterId}`,
        pickedBy && `Picked by: ${pickedBy}`
      ].filter(Boolean).join(', ');

      const seasonDesc = season ? ` (${season})` :
        seasonStart && seasonEnd ? ` (${seasonStart}-${seasonEnd})` :
        seasonCount ? ` (last ${seasonCount} seasons)` : '';
      const summary = `Draft picks for league ${leagueId}${seasonDesc} - ${result.filteredPicks} of ${result.totalPicks} picks${
        filterSummary ? ` (Filters: ${filterSummary})` : ''
      }`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              summary,
              draftId: result.draftId,
              totalPicks: result.totalPicks,
              filteredPicks: result.filteredPicks,
              data: result.picks
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }
        ]
      };
    }
  }

  private async getDraftAvailablePlayers(
    draftId: string,
    position?: string,
    team?: string,
    query?: string,
    maxResults: number = 50,
    includeIntelligence: boolean = false,
    scoringFormat: 'standard' | 'ppr' | 'half-ppr' = 'ppr'
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.draftService.getDraftAvailablePlayers(draftId, {
        position,
        team,
        query,
        maxResults,
        includeIntelligence,
        scoringFormat
      });

      const summary = `Found ${result.availablePlayers.length} available players for draft ${draftId}`;
      const filterSummary = [
        result.filters?.position && `Position: ${result.filters.position}`,
        result.filters?.team && `Team: ${result.filters.team}`,
        result.filters?.query && `Search: "${result.filters.query}"`
      ].filter(Boolean).join(', ');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              summary: filterSummary ? `${summary} (${filterSummary})` : summary,
              draftId: result.draftId,
              totalDraftedPlayers: result.totalDraftedPlayers,
              data: result.availablePlayers
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }
        ]
      };
    }
  }
}