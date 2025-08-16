import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Test tool handler providing basic connectivity and server status verification.
 * Implements MCP tools for testing server functionality and retrieving server information.
 */
export class TestTools {
  /**
   * Returns the MCP tool definitions for test functionality.
   * @returns Array of tool definitions for test operations
   */
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

  /**
   * Checks if this handler can process the specified tool name.
   * @param toolName - The name of the tool to check
   * @returns True if this handler supports the tool, false otherwise
   */
  canHandle(toolName: string): boolean {
    return ['test_connection', 'get_server_info'].includes(toolName);
  }

  /**
   * Handles execution of test tools based on the tool name and arguments.
   * @param name - The name of the tool to execute
   * @param args - Arguments provided to the tool
   * @returns Promise resolving to MCP tool response with test results
   * @example
   * ```typescript
   * const result = await testTools.handleTool('test_connection', { message: 'Hello World' });
   * ```
   */
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

  /**
   * Tests server connectivity by echoing back a message with server status.
   * @param message - Test message to echo back
   * @returns MCP response with success status and echoed message
   */
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

  /**
   * Retrieves comprehensive server information including version, capabilities, and status.
   * @returns MCP response with detailed server information and capabilities
   */
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