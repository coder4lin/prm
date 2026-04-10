# prm - Prompt & Resource Manager

> Manage AI project components (skills, agents, MCPs) across platforms

## Installation

```bash
# Clone and install
git clone https://github.com/yourusername/prm.git
cd prm
bash install.sh
```

## Usage

```bash
# Initialize project with platforms
prm init -t claude-code -t cursor

# Add component from local store
prm add skill my-skill --tool claude-code

# Add with global installation
prm add agent my-agent --tool claude-code --global

# Copy instead of symlink
prm add mcp my-mcp --tool claude-code --copy

# Remove component
prm remove skill my-skill --tool claude-code

# Sync all components from prm.json
prm sync

# List installed components
prm list
```

## Commands

| Command | Description |
|---------|-------------|
| `prm init` | Initialize project with platform selection |
| `prm add <type> <name>` | Add component from local store |
| `prm remove <type> <name>` | Remove component from project |
| `prm sync` | Sync all components from prm.json |
| `prm list` | List installed components |

## Options

- `-t, --tool <platform>` - Target platform
- `-g, --global` - Install globally
- `--copy` - Copy instead of symlink

## Supported Platforms

- claude-code
- copilot
- cursor
- antigravity
- gemini-cli
- opencode
- aider
- windsurf
- openclaw
- qwen
- trae
- kimi

## Local Store Structure

```
~/.prm/store/
├── skills/    # Skill components
├── agents/    # Agent components
└── mcp/       # MCP configurations (JSON)
```

## Configuration

Global config: `~/.prm/config.json`

Project config: `.prm/prm.json`

## License

MIT