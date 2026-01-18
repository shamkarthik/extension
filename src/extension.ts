import * as vscode from 'vscode';
import { DailySummaryProvider } from './webview';
import { GitService } from './git';
import { SummaryService } from './summary';

export function activate(context: vscode.ExtensionContext) {
    console.log('Daily Code Summary extension is now active');

    // Register the webview provider
    const provider = new DailySummaryProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(DailySummaryProvider.viewType, provider)
    );

    // Register the command
    const disposable = vscode.commands.registerCommand('dailyCodeSummary.showSummary', async () => {
        try {
            await generateAndShowSummary(context);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate summary: ${error}`);
        }
    });

    context.subscriptions.push(disposable);


}

async function generateAndShowSummary(context: vscode.ExtensionContext) {
    console.log('generateAndShowSummary called');

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.log('No workspace folder found');
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    console.log('Workspace root:', workspaceRoot);

    // Show progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Generating Daily Summary',
            cancellable: false
        },
        async (progress) => {
            try {
                progress.report({ increment: 0, message: 'Analyzing git history...' });
                console.log('Starting git analysis...');

                const gitService = new GitService(workspaceRoot);
                const gitData = await gitService.getTodaysChanges();
                console.log('Git data retrieved:', {
                    commits: gitData.commits.length,
                    files: gitData.totalFiles.size,
                    insertions: gitData.totalInsertions,
                    deletions: gitData.totalDeletions
                });

                progress.report({ increment: 30, message: 'Generating AI summary...' });
                console.log('Starting AI summary generation...');

                const summaryService = new SummaryService();
                const summary = await summaryService.generateSummary(gitData);
                console.log('Summary generated successfully');

                progress.report({ increment: 60, message: 'Creating report...' });

                // Save to file
                const today = new Date().toISOString().split('T')[0];
                const summaryFileName = `daily_summary_${today}.md`;
                const summaryFilePath = vscode.Uri.joinPath(workspaceFolders[0].uri, summaryFileName);
                console.log('Saving to:', summaryFilePath.fsPath);

                await vscode.workspace.fs.writeFile(
                    summaryFilePath,
                    Buffer.from(summary.markdownReport, 'utf8')
                );

                progress.report({ increment: 100, message: 'Done!' });
                console.log('File saved successfully');

                // Open the file
                const doc = await vscode.workspace.openTextDocument(summaryFilePath);
                await vscode.window.showTextDocument(doc);

                vscode.window.showInformationMessage(`Daily summary saved to ${summaryFileName}`);
                console.log('Summary generation complete!');
            } catch (error) {
                console.error('Error in progress handler:', error);
                throw error;
            }
        }
    );
}

export function deactivate() { }
