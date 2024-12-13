#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

const execAsync = promisify(exec);
const isWindows = platform() === 'win32';

interface SearchUsernameArgs {
  username: string;
  format?: 'txt' | 'html' | 'pdf' | 'json' | 'csv' | 'xmind';
  use_all_sites?: boolean;
  tags?: string[];
}

interface ParseUrlArgs {
  url: string;
  format?: 'txt' | 'html' | 'pdf' | 'json' | 'csv' | 'xmind';
}

interface ExecResult {
  stdout: string;
  stderr: string;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

function isSearchUsernameArgs(args: unknown): args is SearchUsernameArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  return typeof a.username === 'string' &&
    (a.format === undefined || ['txt', 'html', 'pdf', 'json', 'csv', 'xmind'].includes(a.format as string)) &&
    (a.use_all_sites === undefined || typeof a.use_all_sites === 'boolean') &&
    (a.tags === undefined || (Array.isArray(a.tags) && a.tags.every(t => typeof t === 'string')));
}

function isParseUrlArgs(args: unknown): args is ParseUrlArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  return typeof a.url === 'string' &&
    (a.format === undefined || ['txt', 'html', 'pdf', 'json', 'csv', 'xmind'].includes(a.format as string));
}

class MaigretServer {
  private server: Server;
  private venvPath: string = '';
  private pythonPath: string = '';
  private pipPath: string = '';
  private reportsDir: string = '';

  constructor() {
    if (isWindows) {
      throw new Error('Windows is not supported. Please use Linux or MacOS.');
    }

    this.server = new Server({
      name: 'maigret-server',
      version: '0.1.0',
      capabilities: {
        tools: {}
      }
    });

    const homeDir = process.env.HOME || '';
    const maigretDir = join(homeDir, '.maigret');
    
    // Create maigret directory if it doesn't exist
    if (!existsSync(maigretDir)) {
      mkdirSync(maigretDir, { recursive: true });
    }

    // Set up paths
    this.venvPath = join(maigretDir, 'venv');
    this.pythonPath = join(this.venvPath, 'bin', 'python');
    this.pipPath = join(this.venvPath, 'bin', 'pip');
    this.reportsDir = join(maigretDir, 'reports');

    // Create reports directory if it doesn't exist
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }

    console.error('Using virtual environment:', this.venvPath);
    console.error('Using reports directory:', this.reportsDir);
    
    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async execMaigret(args: string[]): Promise<ExecResult> {
    const command = `"${this.pythonPath}" -m maigret ${args.join(' ')}`;
    console.error('Executing command:', command);
    
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024
    });
    
    return { stdout, stderr };
  }

  private async ensureSetup(): Promise<void> {
    try {
      if (!existsSync(this.venvPath)) {
        console.error('Creating virtual environment...');
        await execAsync(`python3 -m venv "${this.venvPath}" --system-site-packages`);
        
        // Install pip using get-pip.py
        console.error('Installing pip...');
        const getPipPath = join(this.venvPath, 'get-pip.py');
        await execAsync(`curl -sSL https://bootstrap.pypa.io/get-pip.py -o "${getPipPath}"`);
        await execAsync(`"${this.pythonPath}" "${getPipPath}"`);
        
        // Clean up get-pip.py
        await execAsync(`rm "${getPipPath}"`);
      }

      // Install dependencies in the virtual environment
      console.error('Installing/updating dependencies...');
      await execAsync(`"${this.pythonPath}" -m pip install --upgrade pip`);
      await execAsync(`"${this.pythonPath}" -m pip install --upgrade maigret`);

      // Verify installation
      const { stdout } = await this.execMaigret(['--version']);
      console.error('Maigret version:', stdout);
    } catch (error) {
      console.error('Failed to setup maigret:', error);
      throw error;
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_username',
          description: 'Search for a username across social networks and sites',
          inputSchema: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
                description: 'Username to search for'
              },
              format: {
                type: 'string',
                enum: ['txt', 'html', 'pdf', 'json', 'csv', 'xmind'],
                description: 'Output format',
                default: 'txt'
              },
              use_all_sites: {
                type: 'boolean',
                description: 'Use all available sites instead of top 500',
                default: false
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Filter sites by tags (e.g. photo, dating, us)',
                default: []
              }
            },
            required: ['username']
          }
        },
        {
          name: 'parse_url',
          description: 'Parse a URL to extract information and search for associated usernames',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                format: 'uri',
                description: 'URL to parse and analyze'
              },
              format: {
                type: 'string',
                enum: ['txt', 'html', 'pdf', 'json', 'csv', 'xmind'],
                description: 'Output format',
                default: 'txt'
              }
            },
            required: ['url']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        await this.ensureSetup();

        switch (request.params.name) {
          case 'search_username': {
            if (!isSearchUsernameArgs(request.params.arguments)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid arguments for search_username'
              );
            }

            const { 
              username, 
              format = 'txt',
              use_all_sites = false,
              tags = []
            } = request.params.arguments;

            const safeUsername = sanitizeFilename(username);
            const reportPath = join(this.reportsDir, `report_${safeUsername}.txt`);

            // Build command arguments
            const args = [
              safeUsername,
              '-T',
              '--print-errors',
              '--no-color'
            ];

            if (use_all_sites) {
              args.push('-a');
            }

            if (tags.length > 0) {
              args.push('--tags', tags.join(','));
            }

            const { stdout, stderr } = await this.execMaigret(args);
            
            // Save output to report file
            writeFileSync(reportPath, stdout);
            console.error('Report saved to:', reportPath);

            return {
              content: [
                {
                  type: 'text',
                  text: `Report saved to: ${reportPath}\n\n${stdout}${stderr ? `\nErrors:\n${stderr}` : ''}`
                }
              ]
            };
          }

          case 'parse_url': {
            if (!isParseUrlArgs(request.params.arguments)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid arguments for parse_url'
              );
            }

            const { url, format = 'txt' } = request.params.arguments;

            const args = [
              '--parse', url,
              '-T',
              '--no-color'
            ];

            const { stdout, stderr } = await this.execMaigret(args);
            return {
              content: [
                {
                  type: 'text',
                  text: stdout + (stderr ? `\nErrors:\n${stderr}` : '')
                }
              ]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error executing maigret: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Maigret MCP server running on stdio');
  }
}

const server = new MaigretServer();
server.run().catch(console.error);
