import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ILeagueService } from '../models/league-models.js';

/**
 * League tool handler providing fantasy football league management and analysis capabilities.
 * Implements MCP tools for league details, matchups, transactions, and user league discovery.
 */
export class LeagueTools {
  /**
   * Creates a new LeagueTools instance.
   * @param leagueService - Service for league data operations and analysis
   */
  constructor(
    private leagueService: ILeagueService
  ) {}

  /**
   * Returns the MCP tool definitions for league-related functionality.
   * @returns Array of tool definitions for league management, matchups, and transactions
   */
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
            },
            includePlayerDetails: {
              type: 'boolean',
              description: 'Include detailed player information with names and starter status (default: false)',
              default: false
            },
            includeRosterDetails: {
              type: 'boolean',
              description: 'Include full roster details including all players and starters (default: false)',
              default: false
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

  /**
   * Checks if this handler can process the specified tool name.
   * @param toolName - The name of the tool to check
   * @returns True if this handler supports the tool, false otherwise
   */
  canHandle(toolName: string): boolean {
    return [
      'get_user_leagues',
      'get_league_details', 
      'get_matchups',
      'get_league_transactions'
    ].includes(toolName);
  }

  /**
   * Handles execution of league tools based on the tool name and arguments.
   * @param name - The name of the tool to execute
   * @param args - Arguments provided to the tool
   * @returns Promise resolving to MCP tool response with league data
   * @example
   * ```typescript
   * const result = await leagueTools.handleTool('get_matchups', { 
   *   leagueId: '123456789', 
   *   week: 5,
   *   includePlayerDetails: true 
   * });
   * ```
   */
  async handleTool(name: string, args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
      case 'get_user_leagues':
        return this.getUserLeagues(args.username, args.season);
      
      case 'get_league_details':
        return this.getLeagueDetails(args.leagueId);
      
      case 'get_matchups':
        return this.getMatchups(args.leagueId, args.week, args.includePlayerDetails, args.includeRosterDetails);
      
      case 'get_league_transactions':
        return this.getLeagueTransactions(args.leagueId, args.week);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Retrieves all fantasy leagues for a specific user.
   * @param username - Username or user ID to search for
   * @param season - Optional season year filter
   * @returns Promise resolving to MCP response with user's leagues
   */
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

  /**
   * Retrieves detailed information about a specific league.
   * @param leagueId - The unique identifier of the league
   * @returns Promise resolving to MCP response with league details and settings
   */
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

  /**
   * Retrieves matchup information for a specific week in a league.
   * @param leagueId - The unique identifier of the league
   * @param week - Optional week number (defaults to current week)
   * @param includePlayerDetails - Whether to include detailed player information
   * @param includeRosterDetails - Whether to include full roster details
   * @returns Promise resolving to MCP response with matchup data
   */
  private async getMatchups(leagueId: string, week?: number, includePlayerDetails?: boolean, includeRosterDetails?: boolean): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.leagueService.getMatchups(leagueId, week, includePlayerDetails, includeRosterDetails);

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

  /**
   * Retrieves recent transactions for a league.
   * @param leagueId - The unique identifier of the league
   * @param week - Optional week number (defaults to current week)
   * @returns Promise resolving to MCP response with transaction data
   */
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