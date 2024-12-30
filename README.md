# Research Quest

An Obsidian plugin that uses AI to generate and track research questions based on your notes.

## Features

- Automatically generates relevant research questions from your current document
- Tracks which questions have been answered in your writing
- Maintains a list of active and completed research questions
- Integrates with OpenAI's GPT models for intelligent question generation and analysis

## Installation

1. Install the plugin from Obsidian's Community Plugins
2. Enable the plugin in Obsidian's settings
3. Add your OpenAI API key in the plugin settings

## Usage

1. Open a note you want to research further
2. Click the microscope icon in the ribbon to open the Research Quest view
3. Click "Refresh" to analyze your current document and generate research questions
4. Questions will be automatically marked as complete when your document answers them

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm run dev

# Build for production
pnpm run build

# Run tests
pnpm test
```

### Installing local plugin

To install the plugin locally, you'll need to symlink the plugin folder to your Obsidian vault's plugins folder.

```bash
ln -s /path/to/research-quest /path/to/obsidian-vault/.obsidian/plugins/research-quest
```

Once you've created the symlink, you can enable the plugin in Obsidian's community plugins settings.

To avoid needing to re-enable the plugin after each change, you can install the [hot-reload](https://github.com/pjeby/hot-reload) Obsidian plugin.

[Further reading](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)