import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IRosterService } from '../models/roster-models.js';

/**
 * Roster tool handler providing fantasy football roster management and analysis capabilities.
 * Implements MCP tools for roster information, standings, and team lineup details.
 */
export class RosterTools {
  /**
   * Creates a new RosterTools instance.
   * @param rosterService - Service for roster data operations and analysis
   */
  constructor(
    private rosterService: IRosterService
  ) {}

  /**
   * Returns the MCP tool definitions for roster-related functionality.
   * @returns Array of tool definitions for roster management and standings
   */
  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_all_rosters',
        description: 'Get all rosters in a league with standings and basic information',
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
        name: 'get_roster',
        description: 'Get roster information for a specific team including players and lineup',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: {
              type: 'string',
              description: 'The league ID'
            },
            rosterIdOrUsername: {
              type: 'string',
              description: 'The roster ID or owner username'
            }
          },
          required: ['leagueId', 'rosterIdOrUsername']
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
    return ['get_all_rosters', 'get_roster'].includes(toolName);
  }

  /**
   * Handles execution of roster tools based on the tool name and arguments.
   * @param name - The name of the tool to execute
   * @param args - Arguments provided to the tool
   * @returns Promise resolving to MCP tool response with roster data
   * @example
   * ```typescript
   * const result = await rosterTools.handleTool('get_roster', { 
   *   leagueId: '123456789', 
   *   rosterIdOrUsername: 'john_doe' 
   * });
   * ```
   */
  async handleTool(name: string, args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
      case 'get_all_rosters':
        return this.getAllRosters(args.leagueId);
      
      case 'get_roster':
        return this.getRoster(args.leagueId, args.rosterIdOrUsername);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Retrieves all rosters in a league with standings and basic information.
   * @param leagueId - The unique identifier of the league
   * @returns Promise resolving to MCP response with all league rosters
   */
  private async getAllRosters(leagueId: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.rosterService.getAllRosters(leagueId);

      const summary = `${result.league.name} - ${result.totalRosters} rosters`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary,
              data: result
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
              error: error instanceof Error ? error.message : String(error)
            })
          }
        ]
      };
    }
  }

  /**
   * Retrieves detailed roster information for a specific team.
   * @param leagueId - The unique identifier of the league
   * @param rosterIdOrUsername - The roster ID or owner username
   * @returns Promise resolving to MCP response with roster details and lineup
   */
  private async getRoster(leagueId: string, rosterIdOrUsername: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const rosterDetails = await this.rosterService.getRoster(leagueId, rosterIdOrUsername);

      if (!rosterDetails) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Roster not found: ${rosterIdOrUsername}`
              })
            }
          ]
        };
      }

      const summary = `Roster for ${rosterDetails.owner?.displayName || rosterDetails.owner?.username || `Roster ${rosterDetails.rosterId}`} (${rosterDetails.record.wins}-${rosterDetails.record.losses}${rosterDetails.record.ties > 0 ? `-${rosterDetails.record.ties}` : ''})`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary,
              data: rosterDetails
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
              error: error instanceof Error ? error.message : String(error)
            })
          }
        ]
      };
    }
  }
}