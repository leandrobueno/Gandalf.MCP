import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IPlayerService } from '../models/player-models.js';

export class PlayerTools {
  constructor(
    private playerService: IPlayerService
  ) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'search_players',
        description: 'Search for NFL players by name, position, or team',
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
              description: 'Maximum number of results to return (default 20)',
              default: 20
            }
          }
        }
      },
      {
        name: 'get_player',
        description: 'Get detailed information about a specific player by ID or name',
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
        description: 'Get trending players based on adds or drops in fantasy leagues',
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
              description: 'Maximum number of results (default 25)',
              default: 25
            }
          }
        }
      }
    ];
  }

  canHandle(toolName: string): boolean {
    return ['search_players', 'get_player', 'get_trending_players'].includes(toolName);
  }

  async handleTool(name: string, args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
      case 'search_players':
        return this.searchPlayers(args.query, args.position, args.team, args.maxResults || 20);
      
      case 'get_player':
        return this.getPlayer(args.playerIdOrName);
      
      case 'get_trending_players':
        return this.getTrendingPlayers(args.type || 'add', args.hours || 24, args.limit || 25);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async searchPlayers(
    query?: string, 
    position?: string, 
    team?: string, 
    maxResults: number = 20
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.playerService.searchPlayers({
        query,
        position,
        team,
        maxResults
      });

      const summary = `Found ${result.players.length} players matching criteria`;
      const filterSummary = [
        result.filters?.query && `Search: "${result.filters.query}"`,
        result.filters?.position && `Position: ${result.filters.position}`,
        result.filters?.team && `Team: ${result.filters.team}`
      ].filter(Boolean).join(', ');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              summary: filterSummary ? `${summary} (${filterSummary})` : summary,
              totalFound: result.totalFound,
              data: result.players
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
                timestamp: new Date().toISOString(),
                error: `Player not found: ${playerIdOrName}`
              }, null, 2)
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
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }
        ]
      };
    }
  }

  private async getTrendingPlayers(
    type: string = 'add', 
    hours: number = 24, 
    limit: number = 25
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.playerService.getTrendingPlayers({
        type: type as 'add' | 'drop',
        hours,
        limit
      });

      const summary = `Top ${result.players.length} trending ${type === 'add' ? 'adds' : 'drops'} in last ${hours} hours`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              summary,
              totalCount: result.totalCount,
              data: result.players
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