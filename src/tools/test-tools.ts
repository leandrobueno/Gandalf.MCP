import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class TestTools {
  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'test_connection',
        description: 'Test tool to verify MCP server is working',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'A test message to echo back'
            }
          },
          required: ['message']
        }
      },
      {
        name: 'get_server_info',
        description: 'Get server information and status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  canHandle(toolName: string): boolean {
    return ['test_connection', 'get_server_info'].includes(toolName);
  }

  async handleTool(name: string, args: Record<string, any>): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
      case 'test_connection':
        return this.testConnection(args.message);
      
      case 'get_server_info':
        return this.getServerInfo();
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private testConnection(message: string): { content: Array<{ type: string; text: string }> } {
    const response = `Gandalf MCP Server (TypeScript) is working! Your message: ${message}`;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            data: { message: response }
          }, null, 2)
        }
      ]
    };
  }

  private getServerInfo(): { content: Array<{ type: string; text: string }> } {
    const serverInfo = {
      serverName: 'Gandalf',
      version: '1.0.0',
      implementation: 'TypeScript',
      status: 'Online',
      description: 'MCP server for Sleeper Fantasy Football',
      capabilities: [
        'League Management',
        'Roster Analysis',
        'Player Search',
        'Draft Tracking',
        'Trending Players',
        'Player Intelligence (ESPN + Sleeper)'
      ]
    };

    const summary = 'Gandalf MCP Server v1.0.0 (TypeScript) - Online and ready for Sleeper Fantasy Football analysis';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            summary,
            data: serverInfo
          }, null, 2)
        }
      ]
    };
  }
}