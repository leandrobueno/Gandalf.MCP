import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Import services
import { MemoryCacheService } from './services/cache-service.js';
import { HistoricalCacheService } from './services/historical-cache-service.js';
import { SleeperApiClient } from './services/sleeper-api-client.js';
import { EspnApiClient } from './services/espn-api-client.js';
import { ESPNIntelligenceClient } from './services/espn-intelligence-client.js';
import { FantasyProClient } from './services/fantasypros-client.js';
import { PlayerIntelligenceService } from './services/player-intelligence-service.js';
import { DraftService } from './services/draft-service.js';
import { PlayerService } from './services/player-service.js';
import { LeagueService } from './services/league-service.js';
import { RosterService } from './services/roster-service.js';

// Import tools
import { TestTools } from './tools/test-tools.js';
import { PlayerTools } from './tools/player-tools.js';
import { LeagueTools } from './tools/league-tools.js';
import { RosterTools } from './tools/roster-tools.js';
import { DraftTools } from './tools/draft-tools.js';

class GandalfMcpServer {
  private server: Server;
  private readonly cacheService: MemoryCacheService;
  private readonly historicalCache: HistoricalCacheService;
  private readonly sleeperClient: SleeperApiClient;
  private espnClient: EspnApiClient;
  private readonly espnIntelligenceClient: ESPNIntelligenceClient;
  private readonly fantasyProClient: FantasyProClient;
  private readonly playerIntelligenceService: PlayerIntelligenceService;
  private readonly draftService: DraftService;
  private readonly playerService: PlayerService;
  private readonly leagueService: LeagueService;
  private readonly rosterService: RosterService;
  private testTools: TestTools;
  private playerTools: PlayerTools;
  private leagueTools: LeagueTools;
  private rosterTools: RosterTools;
  private draftTools: DraftTools;

  constructor() {
    this.server = new Server(
      {
        name: 'gandalf-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize services
    this.cacheService = new MemoryCacheService();
    this.sleeperClient = new SleeperApiClient();
    this.historicalCache = new HistoricalCacheService(this.sleeperClient);
    this.espnClient = new EspnApiClient();
    this.espnIntelligenceClient = new ESPNIntelligenceClient();
    this.fantasyProClient = new FantasyProClient();
    this.playerIntelligenceService = new PlayerIntelligenceService(
      this.espnIntelligenceClient,
      this.fantasyProClient,
      this.sleeperClient,
      this.cacheService
    );
    this.draftService = new DraftService(
      this.sleeperClient, 
      this.cacheService, 
      this.playerIntelligenceService
    );
    this.playerService = new PlayerService(this.sleeperClient, this.cacheService);
    this.leagueService = new LeagueService(this.sleeperClient, this.historicalCache, this.playerService);
    this.rosterService = new RosterService(this.sleeperClient, this.cacheService);

    // Initialize tools
    this.testTools = new TestTools();
    this.playerTools = new PlayerTools(this.playerService);
    this.leagueTools = new LeagueTools(this.leagueService);
    this.rosterTools = new RosterTools(this.rosterService);
    this.draftTools = new DraftTools(this.draftService);

    this.setupHandlers();
    this.setupLogging();
  }

  private setupLogging(): void {
    console.log = (...args) => console.error('[INFO]', ...args);
    console.info = (...args) => console.error('[INFO]', ...args);
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          ...this.testTools.getToolDefinitions(),
          ...this.playerTools.getToolDefinitions(),
          ...this.leagueTools.getToolDefinitions(),
          ...this.rosterTools.getToolDefinitions(),
          ...this.draftTools.getToolDefinitions(),
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Route to appropriate tool handler
      if (this.testTools.canHandle(name)) {
        try {
          return await this.testTools.handleTool(name, args || {});
        } catch (error) {
          console.error(`Error executing tool ${name}:`, error);
          
          if (error instanceof McpError) {
            throw error;
          }
          
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      
      if (this.playerTools.canHandle(name)) {
        try {
          return await this.playerTools.handleTool(name, args || {});
        } catch (error) {
          console.error(`Error executing tool ${name}:`, error);
          
          if (error instanceof McpError) {
            throw error;
          }
          
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      
      if (this.leagueTools.canHandle(name)) {
        try {
          return await this.leagueTools.handleTool(name, args || {});
        } catch (error) {
          console.error(`Error executing tool ${name}:`, error);
          
          if (error instanceof McpError) {
            throw error;
          }
          
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      
      if (this.rosterTools.canHandle(name)) {
        try {
          return await this.rosterTools.handleTool(name, args || {});
        } catch (error) {
          console.error(`Error executing tool ${name}:`, error);
          
          if (error instanceof McpError) {
            throw error;
          }
          
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      
      if (this.draftTools.canHandle(name)) {
        try {
          return await this.draftTools.handleTool(name, args || {});
        } catch (error) {
          console.error(`Error executing tool ${name}:`, error);
          
          if (error instanceof McpError) {
            throw error;
          }
          
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Unknown tool - this is a validation error, not an execution error
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
    });
  }

  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      console.error('[INFO] Gandalf MCP Server (TypeScript) starting...');
      console.error('[INFO] Server ready for Sleeper Fantasy Football operations');
      
      await this.server.connect(transport);
      console.error('[INFO] Server connected successfully');
    } catch (error) {
      console.error('[ERROR] Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.cacheService.destroy();
    console.info('Gandalf MCP Server shutting down...');
  }
}

// Start the server
async function main() {
  try {
    console.error('[INFO] Initializing Gandalf MCP Server...');
    const server = new GandalfMcpServer();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('[INFO] Received SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('[INFO] Received SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    console.error('[INFO] Starting server...');
    await server.start();
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    console.error('[ERROR] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
}

// Always start the server when this module is executed
main().catch(console.error);