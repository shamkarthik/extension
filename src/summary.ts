import * as vscode from 'vscode';
import { GitData } from './git';

export interface SummaryResult {
    aiSummary: string;
    aiTasks: string[];
    hours: number;
    storyPoints: number;
    markdownReport: string;
}

export class SummaryService {
    async generateSummary(gitData: GitData): Promise<SummaryResult> {
        // Calculate metrics
        const hours = this.calculateHours(gitData);
        const storyPoints = this.calculateStoryPoints(gitData);

        // Generate AI summary and tasks
        const aiSummary = await this.generateAISummary(gitData);
        const aiTasks = await this.extractAITasks(gitData);

        // Build markdown report
        const markdownReport = this.buildMarkdownReport(
            gitData,
            aiSummary,
            aiTasks,
            hours,
            storyPoints
        );

        return {
            aiSummary,
            aiTasks,
            hours,
            storyPoints,
            markdownReport
        };
    }

    private calculateHours(gitData: GitData): number {
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

    private calculateStoryPoints(gitData: GitData): number {
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
        if (complexityScore < 5) return 1;
        if (complexityScore < 10) return 2;
        if (complexityScore < 20) return 3;
        if (complexityScore < 40) return 5;
        if (complexityScore < 80) return 8;
        return 13;
    }

    private async getAvailableModel(): Promise<vscode.LanguageModelChat | null> {
        try {
            const config = vscode.workspace.getConfiguration('dailyCodeSummary');
            const preferredModelId = config.get<string>('aiModel', 'auto');
            console.log('Preferred model setting:', preferredModelId);

            const allModels = await vscode.lm.selectChatModels({});

            // If user selected a specific model by ID
            if (preferredModelId !== 'auto') {
                const specificModel = allModels.find(m => m.id === preferredModelId);
                if (specificModel) {
                    console.log('Using user-selected model:', specificModel.name);
                    return specificModel;
                }
            }

            // Priority 1: Gemini / Antigravity (Google)
            const googleModels = allModels.filter(m =>
                m.vendor === 'google' ||
                m.id.toLowerCase().includes('gemini') ||
                m.name.toLowerCase().includes('gemini')
            );
            if (googleModels.length > 0) {
                console.log('Using Google model:', googleModels[0].name);
                return googleModels[0];
            }

            // Priority 2: Smart Copilot Models (GPT-4o, GPT-4, etc.)
            // Based on your debug output, these are distinct models provided by vendor 'copilot'
            const smartCopilotModels = allModels.filter(m =>
                m.vendor === 'copilot' && (
                    m.id.includes('gpt-4o') ||
                    m.id.includes('gpt-4') ||
                    m.id.includes('claude-3-5') ||
                    m.id.includes('gemini') // Sometimes Copilot wraps Gemini
                )
            );

            if (smartCopilotModels.length > 0) {
                // Prefer GPT-4o if available
                const gpt4o = smartCopilotModels.find(m => m.id.includes('gpt-4o'));
                const chosen = gpt4o || smartCopilotModels[0];
                console.log('Using Smart Copilot model:', chosen.name);
                return chosen;
            }

            // Priority 3: Any Copilot model
            const anyCopilot = allModels.find(m => m.vendor === 'copilot');
            if (anyCopilot) {
                console.log('Using standard Copilot model:', anyCopilot.name);
                return anyCopilot;
            }

            // Priority 4: Anything else
            if (allModels.length > 0) {
                console.log('Using fallback available model:', allModels[0].name);
                return allModels[0];
            }

            console.log('No AI models found');
            return null;

        } catch (error) {
            console.error('Error selecting AI model:', error);
            return null;
        }
    }

    private async generateAISummary(gitData: GitData): Promise<string> {
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
                vscode.LanguageModelChatMessage.User(
                    `You are a technical writer helping a developer summarize their daily work.
    
Below is the actual code that was written today, including git diffs showing the changes made.

Your task:
1. Analyze the CODE CHANGES to understand what was actually implemented.
2. Write a PRECISE, CONCISE summary (max 150 words).
3. Focus on the business value and key technical changes.
   
Git Activity with Code Diffs:
${context}

Output a short, high-impact summary.`
                )
            ];

            console.log('Sending request to AI model...');
            const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

            let summary = '';
            for await (const fragment of response.text) {
                summary += fragment;
            }

            console.log('AI summary received, length:', summary.length);
            return summary.trim() || this.generateFallbackSummary(gitData);
        } catch (error) {
            console.error('Error generating AI summary:', error);
            return this.generateFallbackSummary(gitData);
        }
    }

    private async extractAITasks(gitData: GitData): Promise<string[]> {
        try {
            console.log('Attempting to extract AI tasks...');
            const model = await this.getAvailableModel();

            if (!model) {
                console.log('No AI model available for task extraction, using fallback');
                return this.generateFallbackTasks(gitData);
            }

            const context = this.buildContextForAI(gitData);

            const messages = [
                vscode.LanguageModelChatMessage.User(
                    `Based on the following code changes, identify 3-5 important future tasks.

Analyze the CODE DIFFS for TODOs, incomplete features, refactoring needs, or test coverage gaps.

Format each task EXACTLY as follows:
- **[Task Title]** ([Est. Hours]h)
  > [TLDR: 1-line description of what needs to be done]

Rules:
- LIMIT to 3-5 tasks total.
- Estimate hours based on code complexity (0.5h to 4h).
- Be specific and actionable.
- Do NOT output anything else (no intro text).

Git Activity with Code Diffs:
${context}`
                )
            ];

            console.log('Sending task extraction request to AI...');
            const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

            let tasksText = '';
            for await (const fragment of response.text) {
                tasksText += fragment;
            }

            console.log('AI tasks response received, length:', tasksText.length);

            // Parse tasks from response - looking for lines starting with -
            const tasks = tasksText
                .split('\n')
                .filter(line => line.trim().length > 0)
                // We keep the formatting as returned by the AI since we requested markdown
                .reduce((acc: string[], line) => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('-')) {
                        acc.push(trimmed.substring(1).trim());
                    } else if (trimmed.startsWith('>') && acc.length > 0) {
                        // Append the TLDR line to the previous task
                        acc[acc.length - 1] += '\n  ' + trimmed;
                    }
                    return acc;
                }, []);

            return tasks.length > 0 ? tasks : this.generateFallbackTasks(gitData);
        } catch (error) {
            console.error('Error extracting AI tasks:', error);
            return this.generateFallbackTasks(gitData);
        }
    }

    private buildContextForAI(gitData: GitData): string {
        const context: string[] = [];
        const MAX_DIFF_LENGTH = 12000; // Increased limit for better context
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

    private generateFallbackSummary(gitData: GitData): string {
        return `Today's work summary:

Completed ${gitData.commits.length} commits affecting ${gitData.totalFiles.size} files.
Total changes: +${gitData.totalInsertions} -${gitData.totalDeletions} lines.

Commits:
${gitData.commits.map(c => `- ${c.message}`).join('\n')}

${gitData.uncommittedChanges.files.length > 0 ? `\nUncommitted work in progress on ${gitData.uncommittedChanges.files.length} files.` : ''}`;
    }

    private generateFallbackTasks(gitData: GitData): string[] {
        // Extract potential tasks from commit messages
        const tasks: string[] = [];

        gitData.commits.forEach(commit => {
            if (commit.message.toLowerCase().includes('todo')) {
                tasks.push(`**Follow up** (0.5h)\n  > ${commit.message}`);
            }
            if (commit.message.toLowerCase().includes('wip') || commit.message.toLowerCase().includes('in progress')) {
                tasks.push(`**Complete WIP** (1.0h)\n  > ${commit.message}`);
            }
        });

        if (tasks.length === 0) {
            tasks.push('**Review changes** (0.5h)\n  > detailed review of today\'s code');
        }

        return tasks;
    }

    private buildMarkdownReport(
        gitData: GitData,
        aiSummary: string,
        aiTasks: string[],
        hours: number,
        storyPoints: number
    ): string {
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
