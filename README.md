# Gandalf MCP Server - TypeScript Implementation

A TypeScript port of the Gandalf MCP (Model Context Protocol) server for Sleeper Fantasy Football data access.

## Features

- **Player Search & Analysis**: Search NFL players by name, position, or team
- **League Management**: Access league details, standings, and settings
- **Roster Analysis**: View team rosters, lineups, and player information
- **Draft Tracking**: Access draft results and pick history
- **Trending Players**: Get most added/dropped players
- **Player Intelligence**: Enhanced player data with ESPN news integration

## Installation

```bash
npm install
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Start the server
npm start
```

## Usage

The server communicates via MCP (Model Context Protocol) and is designed to be used with Claude Code or other MCP-compatible clients.

### Available Tools

- `test_connection` - Test MCP server connectivity
- `get_server_info` - Get server status and capabilities
- `search_players` - Search for NFL players
- `get_player` - Get detailed player information
- `get_trending_players` - Get trending fantasy players
- `get_user_leagues` - Get user's fantasy leagues
- `get_league_details` - Get league information
- `get_matchups` - Get weekly matchup data
- `get_league_transactions` - Get league transactions
- `get_league_draft` - Get draft information
- `get_all_rosters` - Get all rosters in a league
- `get_roster` - Get specific roster details

## Configuration

The server requires no additional configuration and connects to Sleeper API endpoints automatically.

## Architecture

```
src/
├── models/          # TypeScript interfaces for API responses
├── services/        # API clients and caching
├── tools/           # MCP tool implementations
└── server.ts        # Main server entry point
```

## Logging

Logs are written to `logs/gandalf-mcp-YYYY-MM-DD.log` to avoid interfering with MCP stdio communication.