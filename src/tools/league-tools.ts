import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ILeagueService } from '../models/league-models.js';

export class LeagueTools {
  constructor(
    private leagueService: ILeagueService
  ) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_user_leagues',
        description: 'Get all fantasy leagues for a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username or user ID'
            },
            season: {
              type: 'string',
              description: 'NFL season year (e.g., "2024"). Defaults to current season',
              default: null
            }
          },
          required: ['username']
        }
      },
      {
        name: 'get_league_details',
        description: 'Get detailed information about a specific league including settings and scoring',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: {
              type: 'string',
              description: 'The league ID'
            }
          },
          required: ['leagueId']
        }
      },
      {
        name: 'get_matchups',
        description: 'Get matchup information for a specific week including scores and projections',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: {
              type: 'string',
              description: 'The league ID'
            },
            week: {
              type: 'integer',
              description: 'Week number (optional, defaults to current week)',
              default: null
            }
          },
          required: ['leagueId']
        }
      },
      {
        name: 'get_league_transactions',
        description: 'Get recent transactions (trades, waivers, adds/drops) for a league',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: {
              type: 'string',
              description: 'The league ID'
            },
            week: {
              type: 'integer',
              description: 'Week number (optional, defaults to current week)',
              default: null
            }
          },
          required: ['leagueId']
        }
      },
    ];
  }

  canHandle(toolName: string): boolean {
    return [
      'get_user_leagues',
      'get_league_details', 
      'get_matchups',
      'get_league_transactions'
    ].includes(toolName);
  }

  async handleTool(name: string, args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
      case 'get_user_leagues':
        return this.getUserLeagues(args.username, args.season);
      
      case 'get_league_details':
        return this.getLeagueDetails(args.leagueId);
      
      case 'get_matchups':
        return this.getMatchups(args.leagueId, args.week);
      
      case 'get_league_transactions':
        return this.getLeagueTransactions(args.leagueId, args.week);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getUserLeagues(username: string, season?: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.leagueService.getUserLeagues(username, season);

      const summary = `Found ${result.totalLeagues} leagues for ${result.user.displayName || result.user.username} in ${result.season}`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              summary,
              data: result
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

  private async getLeagueDetails(leagueId: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const league = await this.leagueService.getLeagueDetails(leagueId);
      
      if (!league) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                timestamp: new Date().toISOString(),
                error: `League not found: ${leagueId}`
              }, null, 2)
            }
          ]
        };
      }

      const summary = `${league.name} - ${league.totalRosters} team league (${league.season}) - ${league.scoringType}`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              summary,
              data: league
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

  private async getMatchups(leagueId: string, week?: number): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.leagueService.getMatchups(leagueId, week);

      const summary = `Week ${result.week} matchups for league ${leagueId} - ${result.totalMatchups} matchups`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              summary,
              data: result
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

  private async getLeagueTransactions(leagueId: string, week?: number): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.leagueService.getLeagueTransactions(leagueId, week);

      const summary = `${result.totalTransactions} transactions for week ${result.week} in league ${leagueId}`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              summary,
              data: result
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