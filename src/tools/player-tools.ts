import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IPlayerService } from '../models/player-models.js';

/**
 * Player tool handler providing fantasy football player search and analysis capabilities.
 * Implements MCP tools for searching players, retrieving player details, and tracking trending players.
 */
export class PlayerTools {
  /**
   * Creates a new PlayerTools instance.
   * @param playerService - Service for player data operations and searches
   */
  constructor(
    private playerService: IPlayerService
  ) {}

  /**
   * Returns the MCP tool definitions for player-related functionality.
   * @returns Array of tool definitions for player search, details, and trending analysis
   */
  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'search_players',
        description: 'Search for NFL players by name, position, or team. Returns concise results by default - use detailed=true for full info.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (player name, team abbreviation, or leave empty for all)',
              default: null
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
            maxResults: {
              type: 'integer',
              description: 'Maximum number of results to return (default 10, max 50)',
              default: 10
            },
            detailed: {
              type: 'boolean',
              description: 'Return full player details (default false for token efficiency)',
              default: false
            }
          }
        }
      },
      {
        name: 'get_player',
        description: 'Get detailed information about a specific player by ID or name. Returns complete player profile.',
        inputSchema: {
          type: 'object',
          properties: {
            playerIdOrName: {
              type: 'string',
              description: 'Player ID or full name'
            }
          },
          required: ['playerIdOrName']
        }
      },
      {
        name: 'get_trending_players',
        description: 'Get trending players based on adds or drops in fantasy leagues. Returns concise results by default.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Type of trend: "add" for most added or "drop" for most dropped',
              default: 'add'
            },
            hours: {
              type: 'integer',
              description: 'Number of hours to look back (default 24, max 168)',
              default: 24
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results (default 10, max 50)',
              default: 10
            },
            detailed: {
              type: 'boolean',
              description: 'Return full player details (default false for token efficiency)',
              default: false
            }
          }
        }
      }
    ];
  }

  /**
   * Checks if this handler can process the specified tool name.
   * @param toolName - The name of the tool to check
   * @returns True if this handler supports the tool, false otherwise
   */
  canHandle(toolName: string): boolean {
    return ['search_players', 'get_player', 'get_trending_players'].includes(toolName);
  }

  /**
   * Handles execution of player tools based on the tool name and arguments.
   * @param name - The name of the tool to execute
   * @param args - Arguments provided to the tool
   * @returns Promise resolving to MCP tool response with player data
   * @example
   * ```typescript
   * const result = await playerTools.handleTool('search_players', { 
   *   query: 'mahomes', 
   *   position: 'QB', 
   *   maxResults: 5 
   * });
   * ```
   */
  async handleTool(name: string, args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
      case 'search_players':
        return this.searchPlayers(args.query, args.position, args.team, args.maxResults || 10, args.detailed || false);
      
      case 'get_player':
        return this.getPlayer(args.playerIdOrName);
      
      case 'get_trending_players':
        return this.getTrendingPlayers(args.type || 'add', args.hours || 24, args.limit || 10, args.detailed || false);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Searches for players based on provided criteria.
   * @param query - Optional search query for player names
   * @param position - Optional position filter (QB, RB, WR, TE, K, DEF)
   * @param team - Optional team filter using team abbreviation
   * @param maxResults - Maximum number of results to return
   * @returns Promise resolving to MCP response with search results
   */
  private async searchPlayers(
    query?: string, 
    position?: string, 
    team?: string, 
    maxResults: number = 10,
    detailed: boolean = false
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.playerService.searchPlayers({
        query,
        position,
        team,
        maxResults
      });

      // Create concise or detailed response based on user preference
      const responseData = detailed ? result.players : result.players.map(p => ({
        id: p.playerId,
        name: p.fullName,
        pos: p.position,
        team: p.team,
        rank: p.searchRank
      }));

      const summary = `Found ${result.players.length} players matching criteria`;
      const filterSummary = [
        result.filters?.query && `Search: "${result.filters.query}"`,
        result.filters?.position && `Position: ${result.filters.position}`,
        result.filters?.team && `Team: ${result.filters.team}`
      ].filter(Boolean).join(', ');

      const hints = [];
      if (!detailed && result.players.length > 0) {
        hints.push('💡 Use detailed=true for full player information');
      }
      if (result.totalFound > result.players.length) {
        hints.push(`💡 ${result.totalFound - result.players.length} more players available - increase maxResults`);
      }
      if (result.players.length > 0 && !detailed) {
        hints.push('💡 Use get_player tool with player name or ID for complete details');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              summary: filterSummary ? `${summary} (${filterSummary})` : summary,
              totalFound: result.totalFound,
              showing: result.players.length,
              hints: hints.length > 0 ? hints : undefined,
              data: responseData
            })
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
              error: error instanceof Error ? error.message : String(error)
            })
          }
        ]
      };
    }
  }

  /**
   * Retrieves detailed information about a specific player.
   * @param playerIdOrName - Player ID or full name to search for
   * @returns Promise resolving to MCP response with player details
   */
  private async getPlayer(playerIdOrName: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const player = await this.playerService.getPlayer(playerIdOrName);

      if (!player) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Player not found: ${playerIdOrName}`
              })
            }
          ]
        };
      }

      const summary = `${player.fullName} (${player.position}, ${player.team})`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              summary,
              data: player
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
              error: error instanceof Error ? error.message : String(error)
            })
          }
        ]
      };
    }
  }

  /**
   * Retrieves trending players based on fantasy league activity.
   * @param type - Type of trend to fetch ('add' for most added, 'drop' for most dropped)
   * @param hours - Number of hours to look back for trending data
   * @param limit - Maximum number of trending players to return
   * @returns Promise resolving to MCP response with trending player data
   */
  private async getTrendingPlayers(
    type: string = 'add', 
    hours: number = 24, 
    limit: number = 10,
    detailed: boolean = false
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.playerService.getTrendingPlayers({
        type: type as 'add' | 'drop',
        hours,
        limit
      });

      // Create concise or detailed response
      const responseData = detailed ? result.players : result.players.map(p => ({
        name: p.fullName || 'Unknown Player',
        pos: p.position,
        team: p.team,
        count: p.count,
        trend: type
      }));

      const summary = `Top ${result.players.length} trending ${type === 'add' ? 'adds' : 'drops'} in last ${hours} hours`;
      const hints = [];
      
      if (!detailed && result.players.length > 0) {
        hints.push('💡 Use detailed=true for full player information');
      }
      if (result.totalCount > result.players.length) {
        hints.push(`💡 ${result.totalCount - result.players.length} more trending players available`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              summary,
              totalCount: result.totalCount,
              showing: result.players.length,
              hints: hints.length > 0 ? hints : undefined,
              data: responseData
            })
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
              error: error instanceof Error ? error.message : String(error)
            })
          }
        ]
      };
    }
  }
}