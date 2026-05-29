import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";

const { Client } = pg;

// Read Database URL from env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

const server = new Server(
  {
    name: "supabase-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_sql",
        description: "Execute raw SQL against the Supabase PostgreSQL database.",
        inputSchema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "The SQL statement to execute",
            },
          },
          required: ["sql"],
        },
      },
      {
        name: "list_tables",
        description: "List all user tables in the database.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "execute_sql") {
      const sql = args.sql;
      const client = new Client({ connectionString });
      await client.connect();
      
      try {
        const result = await client.query(sql);
        return {
          content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
        };
      } finally {
        await client.end();
      }
    } else if (name === "list_tables") {
      const sql = `
        SELECT tablename 
        FROM pg_catalog.pg_tables 
        WHERE schemaname != 'pg_catalog' AND 
              schemaname != 'information_schema';
      `;
      const client = new Client({ connectionString });
      await client.connect();
      
      try {
        const result = await client.query(sql);
        return {
          content: [{ type: "text", text: JSON.stringify(result.rows.map(r => r.tablename), null, 2) }],
        };
      } finally {
        await client.end();
      }
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: error.message }],
    };
  }
});

// Run server
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Supabase MCP server running on stdio");
}

run().catch(console.error);
