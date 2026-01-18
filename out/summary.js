"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryService = void 0;
const vscode = __importStar(require("vscode"));
class SummaryService {
    async generateSummary(gitData) {
        // Calculate metrics
        const hours = this.calculateHours(gitData);
        const storyPoints = this.calculateStoryPoints(gitData);
        // Generate AI summary and tasks
        const aiSummary = await this.generateAISummary(gitData);
        const aiTasks = await this.extractAITasks(gitData);
        // Build markdown report
        const markdownReport = this.buildMarkdownReport(gitData, aiSummary, aiTasks, hours, storyPoints);
        return {
            aiSummary,
            aiTasks,
            hours,
            storyPoints,
            markdownReport
        };
    }
    calculateHours(gitData) {
        // Formula: Based on code volume and task count
        // - Base: 1 hour per 100 lines changed
        // - Modifier: +0.5 hour per commit/task
        // - Cap at 6 hours
        const totalLines = gitData.totalInsertions + gitData.totalDeletions;
        const baseHours = totalLines / 100;
        const taskBonus = gitData.commits.length * 0.5;
        const estimatedHours = Math.min(baseHours + taskBonus, 6);
        return Math.round(estimatedHours * 10) / 10; // Round to 1 decimal
    }
    calculateStoryPoints(gitData) {
        // Fibonacci scale: 1, 2, 3, 5, 8, 13
        // Based on complexity signals
        const filesCount = gitData.totalFiles.size;
        const totalLines = gitData.totalInsertions + gitData.totalDeletions;
        const commitsCount = gitData.commits.length;
        // Complexity score
        let complexityScore = 0;
        complexityScore += filesCount * 2; // Each file adds complexity
        complexityScore += totalLines / 50; // Lines per complexity point
        complexityScore += commitsCount * 3; // Each commit indicates a task
        // Map to Fibonacci
        if (complexityScore < 5)
            return 1;
        if (complexityScore < 10)
            return 2;
        if (complexityScore < 20)
            return 3;
        if (complexityScore < 40)
            return 5;
        if (complexityScore < 80)
            return 8;
        return 13;
    }
    async getAvailableModel() {
        // Log all available models first
        try {
            const config = vscode.workspace.getConfiguration('dailyCodeSummary');
            const preferredModelId = config.get('aiModel', 'auto');
            console.log('Preferred model setting:', preferredModelId);
            const allModels = await vscode.lm.selectChatModels({});
            console.log('Available AI models:', allModels.map(m => ({
                id: m.id,
                vendor: m.vendor,
                family: m.family,
                name: m.name
            })));
            if (allModels.length === 0) {
                console.log('No AI models available in VS Code');
                return null;
            }
            // If user selected a specific model, try to get it
            if (preferredModelId !== 'auto') {
                const selectedModels = await vscode.lm.selectChatModels({ id: preferredModelId });
                if (selectedModels.length > 0) {
                    console.log('Using user-selected model:', selectedModels[0].name);
                    return selectedModels[0];
                }
                console.log('User-selected model not found, falling back to auto discovery');
            }
            // Try Antigravity/Google models first
            const googleModels = await vscode.lm.selectChatModels({
                vendor: 'google'
            });
            if (googleModels.length > 0) {
                console.log('Using Google/Antigravity model:', googleModels[0].name);
                return googleModels[0];
            }
            // Try Copilot models
            const copilotModels = await vscode.lm.selectChatModels({
                vendor: 'copilot'
            });
            if (copilotModels.length > 0) {
                console.log('Using Copilot model:', copilotModels[0].name);
                return copilotModels[0];
            }
            // Try any available model
            console.log('Using first available model:', allModels[0].name);
            return allModels[0];
        }
        catch (error) {
            console.error('Error selecting AI model:', error);
            return null;
        }
    }
    async generateAISummary(gitData) {
        try {
            console.log('Attempting to get AI model...');
            const model = await this.getAvailableModel();
            if (!model) {
                console.log('No AI model available, using fallback summary');
                return this.generateFallbackSummary(gitData);
            }
            console.log('Using AI model:', model.name, 'from', model.vendor);
            // Build context from git data
            const context = this.buildContextForAI(gitData);
            console.log('Context length:', context.length, 'characters');
            const messages = [
                vscode.LanguageModelChatMessage.User(`You are a technical writer helping a developer summarize their daily work for a stand-up meeting or agile board update.

Below is the actual code that was written today, including git diffs showing the changes made.

Your task:
1. Analyze the CODE CHANGES (not just commit messages) to understand what was actually implemented
2. Identify the business value and technical accomplishments
3. Write a professional 100-400 word summary that explains:
   - What features or functionality were added/modified
   - What problems were solved
   - What technical improvements were made
   - The overall impact of the work

Focus on WHAT THE CODE DOES, not just what files were changed.

Git Activity with Code Diffs:
${context}

Write a clear, professional summary suitable for a daily stand-up or agile board update. Be specific about what was accomplished based on the actual code changes.`)
            ];
            console.log('Sending request to AI model...');
            const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
            let summary = '';
            for await (const fragment of response.text) {
                summary += fragment;
            }
            console.log('AI summary received, length:', summary.length);
            return summary.trim() || this.generateFallbackSummary(gitData);
        }
        catch (error) {
            console.error('Error generating AI summary:', error);
            return this.generateFallbackSummary(gitData);
        }
    }
    async extractAITasks(gitData) {
        try {
            console.log('Attempting to extract AI tasks...');
            const model = await this.getAvailableModel();
            if (!model) {
                console.log('No AI model available for task extraction, using fallback');
                return this.generateFallbackTasks(gitData);
            }
            const context = this.buildContextForAI(gitData);
            const messages = [
                vscode.LanguageModelChatMessage.User(`Based on the following code changes from today's work, identify future tasks or work items that should be created.

Analyze the CODE DIFFS to look for:
- TODO comments in the code
- Incomplete features or partial implementations
- Technical debt that needs addressing
- Edge cases that aren't handled yet
- Follow-up work mentioned in comments
- Refactoring opportunities

Git Activity with Code Diffs:
${context}

List each task on a new line, prefixed with "- ". Be specific and actionable. Focus on what you can see in the actual code changes.`)
            ];
            console.log('Sending task extraction request to AI...');
            const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
            let tasksText = '';
            for await (const fragment of response.text) {
                tasksText += fragment;
            }
            console.log('AI tasks response received, length:', tasksText.length);
            // Parse tasks from response
            const tasks = tasksText
                .split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.trim().substring(1).trim());
            return tasks.length > 0 ? tasks : this.generateFallbackTasks(gitData);
        }
        catch (error) {
            console.error('Error extracting AI tasks:', error);
            return this.generateFallbackTasks(gitData);
        }
    }
    buildContextForAI(gitData) {
        const context = [];
        const MAX_DIFF_LENGTH = 8000; // Limit to avoid token limits
        let totalDiffLength = 0;
        // Add commits with actual code diffs
        gitData.commits.forEach((commit, index) => {
            context.push(`\n=== Commit ${index + 1}: ${commit.message} ===`);
            context.push(`Files: ${commit.filesChanged.join(', ')}`);
            context.push(`Changes: +${commit.insertions} -${commit.deletions} lines`);
            // Add actual diff (truncated if too long)
            if (commit.diff && totalDiffLength < MAX_DIFF_LENGTH) {
                const remainingSpace = MAX_DIFF_LENGTH - totalDiffLength;
                const diffToAdd = commit.diff.substring(0, remainingSpace);
                context.push(`\nCode Changes:\n${diffToAdd}`);
                totalDiffLength += diffToAdd.length;
            }
        });
        // Add uncommitted changes with diff
        if (gitData.uncommittedChanges.files.length > 0) {
            context.push(`\n=== Uncommitted Work in Progress ===`);
            context.push(`Files: ${gitData.uncommittedChanges.files.join(', ')}`);
            context.push(`Changes: +${gitData.uncommittedChanges.insertions} -${gitData.uncommittedChanges.deletions} lines`);
            if (gitData.uncommittedChanges.diff && totalDiffLength < MAX_DIFF_LENGTH) {
                const remainingSpace = MAX_DIFF_LENGTH - totalDiffLength;
                const diffToAdd = gitData.uncommittedChanges.diff.substring(0, remainingSpace);
                context.push(`\nCode Changes:\n${diffToAdd}`);
            }
        }
        return context.join('\n');
    }
    generateFallbackSummary(gitData) {
        return `Today's work summary:

Completed ${gitData.commits.length} commits affecting ${gitData.totalFiles.size} files.
Total changes: +${gitData.totalInsertions} -${gitData.totalDeletions} lines.

Commits:
${gitData.commits.map(c => `- ${c.message}`).join('\n')}

${gitData.uncommittedChanges.files.length > 0 ? `\nUncommitted work in progress on ${gitData.uncommittedChanges.files.length} files.` : ''}`;
    }
    generateFallbackTasks(gitData) {
        // Extract potential tasks from commit messages
        const tasks = [];
        gitData.commits.forEach(commit => {
            if (commit.message.toLowerCase().includes('todo')) {
                tasks.push(`Follow up on: ${commit.message}`);
            }
            if (commit.message.toLowerCase().includes('wip') || commit.message.toLowerCase().includes('in progress')) {
                tasks.push(`Complete: ${commit.message}`);
            }
        });
        if (tasks.length === 0) {
            tasks.push('No specific follow-up tasks identified');
        }
        return tasks;
    }
    buildMarkdownReport(gitData, aiSummary, aiTasks, hours, storyPoints) {
        const today = new Date().toISOString().split('T')[0];
        return `# Daily Summary - ${today}

## Summary
${aiSummary}

## Metrics
- **Hours**: ${hours}h
- **Story Points**: ${storyPoints}
- **Files Changed**: ${gitData.totalFiles.size}
- **Lines Added**: ${gitData.totalInsertions}
- **Lines Deleted**: ${gitData.totalDeletions}
- **Commits**: ${gitData.commits.length}

## Tasks to Create
${aiTasks.map(task => `- ${task}`).join('\n')}

## Detailed Changes

### Commits
${gitData.commits.map(commit => `
#### ${commit.message}
- **Hash**: \`${commit.hash.substring(0, 7)}\`
- **Time**: ${commit.date.toLocaleTimeString()}
- **Files**: ${commit.filesChanged.length}
- **Changes**: +${commit.insertions} -${commit.deletions}
`).join('\n')}

${gitData.uncommittedChanges.files.length > 0 ? `
### Uncommitted Changes
- **Files**: ${gitData.uncommittedChanges.files.join(', ')}
- **Changes**: +${gitData.uncommittedChanges.insertions} -${gitData.uncommittedChanges.deletions}
` : ''}

---
*Generated by Daily Code Summary Extension*
`;
    }
}
exports.SummaryService = SummaryService;
//# sourceMappingURL=summary.js.map