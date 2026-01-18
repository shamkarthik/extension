# Daily Code Summary Extension

Automatically generates daily summaries of your code changes for agile boards (Jira, Azure DevOps, etc.).

## Features

- 📊 **AI-Powered Summaries**: Uses **Google Gemini**, **Antigravity**, or **VS Code Copilot** to generate high-quality summaries
- ⏱️ **Hours Estimation**: Calculates work hours based on code volume (max 6h/day)
- 🎯 **Story Points**: Estimates story points using Fibonacci scale (1-13)
- 📝 **Task Extraction**: Identifies future tasks from TODOs and incomplete work
- 📄 **Markdown Export**: Creates `daily_summary_YYYY-MM-DD.md` files
- 🔄 **Agile Board Ready**: Generic format works with Jira, DevOps, or any agile tool

## Requirements

- Git repository
- One of the following AI extensions installed and active:
  - **Gemini Code Assist** (Google)
  - **Antigravity**
  - **GitHub Copilot Chat**
- VS Code 1.85.0 or higher

## Usage

1. Open a git repository in VS Code
2. Run command: `Daily Summary: Show Today's Work`
3. The extension will:
   - Analyze today's commits
   - Generate an AI summary
   - Calculate hours and story points
   - Extract future tasks
   - Create a markdown file with the report

## Output Example

The generated markdown file includes:
- AI-generated summary (100-400 words)
- Hours and story points estimates
- Tasks to create
- Detailed commit history
- File changes

## Development

```bash
npm install
npm run compile
# Press F5 to debug
```

## License

MIT
