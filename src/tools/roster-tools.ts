import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IRosterService } from '../models/roster-models.js';

export class RosterTools {
  constructor(
    private rosterService: IRosterService
  ) {}

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

  canHandle(toolName: string): boolean {
    return ['get_all_rosters', 'get_roster'].includes(toolName);
  }

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

  private async getAllRosters(leagueId: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.rosterService.getAllRosters(leagueId);

      const summary = `${result.league.name} - ${result.totalRosters} rosters`;

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

  private async getRoster(leagueId: string, rosterIdOrUsername: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const rosterDetails = await this.rosterService.getRoster(leagueId, rosterIdOrUsername);

      if (!rosterDetails) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                timestamp: new Date().toISOString(),
                error: `Roster not found: ${rosterIdOrUsername}`
              }, null, 2)
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
              success: true,
              timestamp: new Date().toISOString(),
              summary,
              data: rosterDetails
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