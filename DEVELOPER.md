# Developer Guide - Daily Code Summary Extension

This guide covers everything you need to know about developing, debugging, and releasing the Daily Code Summary VS Code extension.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Debugging](#debugging)
- [Testing](#testing)
- [Building for Release](#building-for-release)
- [Publishing to VS Code Marketplace](#publishing-to-vs-code-marketplace)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18.x or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify installation: `git --version`

4. **Visual Studio Code**
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)
   - Version 1.85.0 or higher required

5. **GitHub Copilot** (for testing AI features)
   - Active subscription required for AI-powered summaries

---

## Development Environment Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd extension
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies listed in `package.json`:
- TypeScript compiler
- VS Code extension types
- ESLint and TypeScript ESLint plugins
- Node.js types

### 3. Verify TypeScript Configuration

The project uses TypeScript. Check that `tsconfig.json` is properly configured:

```bash
# Compile TypeScript to verify setup
npm run compile
```

This should create compiled JavaScript files in the `out/` directory.

### 4. Install VS Code Extension Development Tools (Optional)

For packaging and publishing, install `vsce` globally:

```bash
npm install -g @vscode/vsce
```

---

## Project Structure

```
extension/
├── .eslintrc.json          # ESLint configuration
├── .vscodeignore           # Files to exclude from extension package
├── package.json            # Extension manifest and dependencies
├── tsconfig.json           # TypeScript configuration
├── README.md               # User-facing documentation
├── DEVELOPER.md            # This file
├── src/                    # Source TypeScript files
│   ├── extension.ts        # Main extension entry point
│   ├── git.ts              # Git operations
│   ├── summary.ts          # Summary generation logic
│   └── webview.ts          # Webview UI provider
├── out/                    # Compiled JavaScript (generated)
└── node_modules/           # Dependencies (generated)
```

### Key Files

- **`package.json`**: Extension manifest defining commands, views, activation events, and metadata
- **`src/extension.ts`**: Entry point that activates the extension and registers commands
- **`src/git.ts`**: Handles Git operations (fetching commits, diffs, etc.)
- **`src/summary.ts`**: AI-powered summary generation using Copilot LM API
- **`src/webview.ts`**: Manages the webview panel for displaying summaries

---

## Development Workflow

### 1. Watch Mode for Auto-Compilation

During development, use watch mode to automatically recompile on file changes:

```bash
npm run watch
```

This runs `tsc -watch -p ./` which monitors TypeScript files and recompiles automatically.

### 2. Code Linting

Run ESLint to check for code quality issues:

```bash
npm run lint
```

Fix linting issues automatically where possible:

```bash
npm run lint -- --fix
```

### 3. Making Changes

1. Edit TypeScript files in `src/`
2. Save changes (auto-compiles if watch mode is running)
3. Reload the extension in the debug window (see [Debugging](#debugging))

---

## Debugging

### Method 1: Using F5 (Recommended)

1. Open the project in VS Code
2. Press **F5** (or Run → Start Debugging)
3. This will:
   - Compile the TypeScript code
   - Open a new "Extension Development Host" window
   - Load your extension in debug mode

4. In the Extension Development Host window:
   - Open a Git repository
   - Press **Ctrl+Shift+P** (Windows/Linux) or **Cmd+Shift+P** (Mac)
   - Type "Daily Summary: Show Today's Work"
   - Run the command

5. Set breakpoints in your TypeScript files to debug
6. Use the Debug Console in the main VS Code window to view logs

### Method 2: Manual Launch Configuration

The project should have a `.vscode/launch.json` file. If not, create one:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
```

### Debugging Tips

- **Console Logging**: Use `console.log()` - output appears in the Debug Console
- **Breakpoints**: Click in the gutter next to line numbers to set breakpoints
- **Reload Extension**: In the Extension Development Host, press **Ctrl+R** (Windows/Linux) or **Cmd+R** (Mac) to reload the extension after making changes
- **View Logs**: Check the Output panel → "Extension Host" for extension logs
- **Inspect Webview**: Right-click on the webview and select "Open Webview Developer Tools"

### Common Debugging Scenarios

#### Extension Not Activating
- Check `activationEvents` in `package.json`
- Verify the command is registered in `contributes.commands`
- Look for errors in the Debug Console

#### Git Operations Failing
- Ensure you're testing in a valid Git repository
- Check that Git is installed and accessible from command line
- Review `src/git.ts` for error handling

#### AI Summary Not Working
- Verify GitHub Copilot is active and authenticated
- Check Copilot subscription status
- Review `src/summary.ts` for API errors

---

## Testing

### Manual Testing

1. Start debugging (F5)
2. In the Extension Development Host:
   - Open a Git repository with recent commits
   - Run the command
   - Verify the webview displays correctly
   - Check that the markdown file is generated
   - Validate the summary content

### Test Checklist

- [ ] Extension activates without errors
- [ ] Command appears in Command Palette
- [ ] Webview opens and displays summary
- [ ] Git commits are correctly fetched
- [ ] AI summary is generated (with Copilot active)
- [ ] Hours and story points are calculated
- [ ] Tasks are extracted from TODOs
- [ ] Markdown file is created with correct format
- [ ] Works with different Git repositories
- [ ] Handles edge cases (no commits today, no Copilot, etc.)

### Automated Testing (Future Enhancement)

The project has a test script placeholder:

```bash
npm run pretest  # Compiles and lints
npm test         # Runs tests (needs implementation)
```

To add tests, implement test files in `src/test/` using the VS Code Extension Test Runner.

---

## Building for Release

### 1. Update Version Number

Edit `package.json` and increment the version:

```json
{
  "version": "0.0.2"  // or 0.1.0, 1.0.0, etc.
}
```

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes

### 2. Update Changelog (Recommended)

Create or update `CHANGELOG.md`:

```markdown
# Changelog

## [0.1.0] - 2026-01-17
### Added
- Initial release
- AI-powered daily summaries
- Hours and story points estimation
- Task extraction from TODOs
```

### 3. Clean Build

```bash
# Remove old build artifacts
rm -rf out/

# Compile for production
npm run vscode:prepublish
```

This runs `npm run compile` which compiles TypeScript with production settings.

### 4. Package the Extension

Create a `.vsix` file (installable extension package):

```bash
vsce package
```

This creates a file like `daily-code-summary-0.0.1.vsix`.

#### Package Options

- **Specific version**: `vsce package 1.0.0`
- **Pre-release**: `vsce package --pre-release`
- **Target platform**: `vsce package --target win32-x64`

### 5. Test the Package Locally

Install the `.vsix` file in VS Code:

1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Click "..." menu → "Install from VSIX..."
4. Select your `.vsix` file
5. Test thoroughly before publishing

---

## Publishing to VS Code Marketplace

### Prerequisites for Publishing

1. **Microsoft Account**: Create one at [account.microsoft.com](https://account.microsoft.com/)
2. **Azure DevOps Organization**: Create at [dev.azure.com](https://dev.azure.com/)
3. **Publisher Account**: Create at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
4. **Personal Access Token (PAT)**: Generate in Azure DevOps

### Step 1: Create a Publisher

1. Go to [VS Code Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Click "Create publisher"
4. Fill in details:
   - **ID**: Unique identifier (e.g., `your-name`)
   - **Name**: Display name
   - **Email**: Contact email

### Step 2: Generate Personal Access Token

1. Go to [Azure DevOps](https://dev.azure.com/)
2. Click on User Settings (top right) → Personal Access Tokens
3. Click "New Token"
4. Configure:
   - **Name**: "VS Code Publishing"
   - **Organization**: All accessible organizations
   - **Expiration**: Set appropriate duration
   - **Scopes**: Select "Marketplace" → "Manage"
5. Click "Create" and **copy the token** (you won't see it again!)

### Step 3: Add Publisher to package.json

Edit `package.json`:

```json
{
  "name": "daily-code-summary",
  "publisher": "your-publisher-id",
  "version": "0.1.0",
  ...
}
```

### Step 4: Login with vsce

```bash
vsce login your-publisher-id
```

Enter your Personal Access Token when prompted.

### Step 5: Publish the Extension

```bash
# Publish current version
vsce publish

# Or publish with version bump
vsce publish minor  # 0.0.1 → 0.1.0
vsce publish patch  # 0.0.1 → 0.0.2
vsce publish major  # 0.0.1 → 1.0.0
```

### Step 6: Verify Publication

1. Go to [VS Code Marketplace](https://marketplace.visualstudio.com/)
2. Search for your extension
3. Verify the listing looks correct
4. Install it from the marketplace to test

### Publishing Updates

To publish an update:

1. Make your changes
2. Update version in `package.json`
3. Update `CHANGELOG.md`
4. Commit changes
5. Run `vsce publish`

### Unpublishing (Use with Caution)

```bash
# Unpublish a specific version
vsce unpublish your-publisher-id.daily-code-summary@0.0.1

# Unpublish entire extension
vsce unpublish your-publisher-id.daily-code-summary
```

---

## Additional Configuration

### Add Extension Icon

1. Create a 128x128 PNG icon
2. Save as `icon.png` in the root directory
3. Add to `package.json`:

```json
{
  "icon": "icon.png",
  ...
}
```

### Add Repository Information

Add to `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/daily-code-summary"
  },
  "bugs": {
    "url": "https://github.com/your-username/daily-code-summary/issues"
  },
  "homepage": "https://github.com/your-username/daily-code-summary#readme",
  ...
}
```

### Add License

1. Create a `LICENSE` file (e.g., MIT License)
2. Add to `package.json`:

```json
{
  "license": "MIT",
  ...
}
```

### Improve Marketplace Listing

Add to `package.json`:

```json
{
  "keywords": [
    "git",
    "summary",
    "agile",
    "jira",
    "productivity",
    "copilot"
  ],
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  },
  ...
}
```

---

## Troubleshooting

### "Cannot find module 'vscode'" Error on F5

**Problem**: When pressing F5, you get an error like:
```
Uncaught Error Error: Cannot find module 'vscode'
```

**Root Cause**: VS Code extensions cannot be run as standalone Node.js applications. They must be launched within VS Code's Extension Host environment.

**Solutions**:
1. **Ensure `.vscode/launch.json` exists** with the correct configuration:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Run Extension",
         "type": "extensionHost",
         "request": "launch",
         "args": [
           "--extensionDevelopmentPath=${workspaceFolder}"
         ],
         "outFiles": [
           "${workspaceFolder}/out/**/*.js"
         ],
         "preLaunchTask": "${defaultBuildTask}"
       }
     ]
   }
   ```

2. **Ensure `.vscode/tasks.json` exists** for the build task:
   ```json
   {
     "version": "2.0.0",
     "tasks": [
       {
         "type": "npm",
         "script": "watch",
         "problemMatcher": "$tsc-watch",
         "isBackground": true,
         "presentation": {
           "reveal": "silent"
         },
         "group": {
           "kind": "build",
           "isDefault": true
         }
       }
     ]
   }
   ```

3. **Reload VS Code** after creating these files
4. **Press F5 again** - it should now launch the Extension Development Host

### Compilation Errors

**Problem**: TypeScript compilation fails

**Solutions**:
- Run `npm install` to ensure all dependencies are installed
- Check `tsconfig.json` for correct configuration
- Verify TypeScript version: `npx tsc --version`
- Delete `out/` and `node_modules/`, then run `npm install` and `npm run compile`

### Extension Not Loading

**Problem**: Extension doesn't activate in debug mode

**Solutions**:
- Check Debug Console for errors
- Verify `activationEvents` in `package.json`
- Ensure `main` points to correct file: `"./out/extension.js"`
- Try reloading the Extension Development Host window

### vsce Command Not Found

**Problem**: `vsce: command not found`

**Solution**:
```bash
npm install -g @vscode/vsce
```

### Publishing Fails

**Problem**: `vsce publish` returns an error

**Solutions**:
- Verify you're logged in: `vsce login your-publisher-id`
- Check PAT hasn't expired
- Ensure `publisher` field is in `package.json`
- Verify version number is higher than published version
- Check that all required files are included (not in `.vscodeignore`)

### Git Operations Fail

**Problem**: Extension can't read Git commits

**Solutions**:
- Ensure testing in a valid Git repository
- Verify Git is installed: `git --version`
- Check that repository has commits
- Review error messages in Debug Console

### Copilot API Errors

**Problem**: AI summary generation fails

**Solutions**:
- Verify GitHub Copilot is installed and active
- Check Copilot subscription status
- Ensure you're authenticated with GitHub
- Review API error messages in Debug Console
- Test with a simpler prompt to isolate issues

---

## Best Practices

### Code Quality

- Run `npm run lint` before committing
- Use meaningful variable and function names
- Add comments for complex logic
- Follow TypeScript best practices
- Handle errors gracefully with try-catch blocks

### Version Control

- Commit frequently with clear messages
- Use feature branches for new features
- Tag releases: `git tag v0.1.0`
- Keep `CHANGELOG.md` updated

### Testing

- Test with different Git repositories
- Test edge cases (no commits, no Copilot, etc.)
- Test on different operating systems if possible
- Get feedback from beta testers before major releases

### Documentation

- Keep `README.md` user-focused
- Keep `DEVELOPER.md` (this file) developer-focused
- Document API changes in code comments
- Update documentation when adding features

---

## Useful Commands Reference

```bash
# Development
npm install                    # Install dependencies
npm run compile               # Compile TypeScript
npm run watch                 # Auto-compile on changes
npm run lint                  # Check code quality
npm run lint -- --fix         # Fix linting issues

# Packaging
vsce package                  # Create .vsix file
vsce package --pre-release    # Create pre-release package

# Publishing
vsce login <publisher-id>     # Login to marketplace
vsce publish                  # Publish extension
vsce publish minor            # Publish with version bump
vsce unpublish <extension>    # Unpublish extension

# Debugging
# Press F5 in VS Code          # Start debugging
# Ctrl+R in Extension Host     # Reload extension
```

---

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)
- [GitHub Copilot API](https://code.visualstudio.com/api/extension-guides/language-model)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)

---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review VS Code extension documentation
- Open an issue on the GitHub repository
- Contact the development team

---

**Happy Coding! 🚀**
