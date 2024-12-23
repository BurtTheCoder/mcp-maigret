# Maigret MCP Server
[![smithery badge](https://smithery.ai/badge/mcp-maigret)](https://smithery.ai/server/mcp-maigret)

A Model Context Protocol (MCP) server for [maigret](https://github.com/soxoj/maigret), a powerful OSINT tool that collects user account information from various public sources. This server provides tools for searching usernames across social networks and analyzing URLs. It is designed to integrate seamlessly with MCP-compatible applications like [Claude Desktop](https://claude.ai).

<a href="https://glama.ai/mcp/servers/knnpcz651x"><img width="380" height="200" src="https://glama.ai/mcp/servers/knnpcz651x/badge" alt="mcp-maigret MCP server" /></a>


## ⚠️ Warning

This tool is designed for legitimate OSINT research purposes. Please:
- Only search for information that is publicly available
- Respect privacy and data protection laws
- Follow the terms of service of the platforms being searched
- Use responsibly and ethically
- Be aware that some sites may rate-limit or block automated searches

## Requirements

- Node.js (v18 or later)
- Docker
- macOS, Linux, or Windows with Docker Desktop installed
- Write access to the reports directory

## Quick Start

### Installing via Smithery

To install Maigret for Claude Desktop automatically via [Smithery](https://smithery.ai/server/mcp-maigret):

```bash
npx -y @smithery/cli install mcp-maigret --client claude
```

### Installing Manually
1. Install Docker:
   - macOS: Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: Follow the [Docker Engine installation guide](https://docs.docker.com/engine/install/)

2. Install the server globally via npm:
```bash
npm install -g mcp-maigret
```

3. Create a reports directory:
```bash
mkdir -p /path/to/reports/directory
```

4. Add to your Claude Desktop configuration file:
```json
{
  "mcpServers": {
    "maigret": {
      "command": "mcp-maigret",
      "env": {
        "MAIGRET_REPORTS_DIR": "/path/to/reports/directory"
      }
    }
  }
}
```

Configuration file location:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

5. Restart Claude Desktop

## Alternative Setup (From Source)

If you prefer to run from source or need to modify the code:

1. Clone and build:
```bash
git clone <repository_url>
cd mcp-maigret
npm install
npm run build
```

2. Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "maigret": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-maigret/build/index.js"],
      "env": {
        "MAIGRET_REPORTS_DIR": "/path/to/reports/directory"
      }
    }
  }
}
```

## Features

- **Username Search**: Search for a username across hundreds of social networks and websites
- **URL Analysis**: Parse URLs to extract information and search for associated usernames
- **Multiple Output Formats**: Support for txt, html, pdf, json, csv, and xmind formats
- **Site Filtering**: Filter searches by site tags (e.g., photo, dating, us)
- **Docker-based**: Reliable and consistent execution across environments

## Tools

### 1. Username Search Tool
- Name: `search_username`
- Description: Search for a username across social networks and sites
- Parameters:
  * `username` (required): Username to search for
  * `format` (optional, default: "pdf"): Output format (txt, html, pdf, json, csv, xmind)
  * `use_all_sites` (optional, default: false): Use all available sites instead of top 500
  * `tags` (optional): Array of tags to filter sites (e.g., ["photo", "dating"])

Example:
```json
{
  "username": "test_user123",
  "format": "html",
  "use_all_sites": false,
  "tags": ["photo"]
}
```

### 2. URL Analysis Tool
- Name: `parse_url`
- Description: Parse a URL to extract information and search for associated usernames
- Parameters:
  * `url` (required): URL to analyze
  * `format` (optional, default: "pdf"): Output format (txt, html, pdf, json, csv, xmind)

Example:
```json
{
  "url": "https://example.com/profile",
  "format": "txt"
}
```

## Troubleshooting

### Docker Issues

1. Verify Docker is installed and running:
```bash
docker --version
docker ps
```

2. Check Docker permissions:
   - Ensure your user has permissions to run Docker commands
   - On Linux, add your user to the docker group: `sudo usermod -aG docker $USER`

### Reports Directory Issues

1. Verify the reports directory:
   - The directory specified in MAIGRET_REPORTS_DIR must exist
   - Your user must have write permissions to this directory
   - Check permissions: `ls -la /path/to/reports/directory`

2. Common configuration mistakes:
   - Missing MAIGRET_REPORTS_DIR environment variable
   - Directory doesn't exist
   - Incorrect permissions
   - Trailing slashes in the path

3. After fixing any issues:
   - Save the configuration file
   - Restart Claude Desktop

## Error Messages

- "Docker is not installed or not running": Install Docker and start the Docker daemon
- "MAIGRET_REPORTS_DIR environment variable must be set": Add the environment variable to your configuration
- "Error creating reports directory": Check directory permissions and path
- "Error executing maigret": Check Docker logs and ensure the container has proper permissions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
