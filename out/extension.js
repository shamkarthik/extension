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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const webview_1 = require("./webview");
const git_1 = require("./git");
const summary_1 = require("./summary");
function activate(context) {
    console.log('Daily Code Summary extension is now active');
    // Register the webview provider
    const provider = new webview_1.DailySummaryProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(webview_1.DailySummaryProvider.viewType, provider));
    // Register the command
    const disposable = vscode.commands.registerCommand('dailyCodeSummary.showSummary', async () => {
        try {
            await generateAndShowSummary(context);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to generate summary: ${error}`);
        }
    });
    context.subscriptions.push(disposable);
}
async function generateAndShowSummary(context) {
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
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating Daily Summary',
        cancellable: false
    }, async (progress) => {
        try {
            progress.report({ increment: 0, message: 'Analyzing git history...' });
            console.log('Starting git analysis...');
            const gitService = new git_1.GitService(workspaceRoot);
            const gitData = await gitService.getTodaysChanges();
            console.log('Git data retrieved:', {
                commits: gitData.commits.length,
                files: gitData.totalFiles.size,
                insertions: gitData.totalInsertions,
                deletions: gitData.totalDeletions
            });
            progress.report({ increment: 30, message: 'Generating AI summary...' });
            console.log('Starting AI summary generation...');
            const summaryService = new summary_1.SummaryService();
            const summary = await summaryService.generateSummary(gitData);
            console.log('Summary generated successfully');
            progress.report({ increment: 60, message: 'Creating report...' });
            // Save to file
            const today = new Date().toISOString().split('T')[0];
            const summaryFileName = `daily_summary_${today}.md`;
            const summaryFilePath = vscode.Uri.joinPath(workspaceFolders[0].uri, summaryFileName);
            console.log('Saving to:', summaryFilePath.fsPath);
            await vscode.workspace.fs.writeFile(summaryFilePath, Buffer.from(summary.markdownReport, 'utf8'));
            progress.report({ increment: 100, message: 'Done!' });
            console.log('File saved successfully');
            // Open the file
            const doc = await vscode.workspace.openTextDocument(summaryFilePath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`Daily summary saved to ${summaryFileName}`);
            console.log('Summary generation complete!');
        }
        catch (error) {
            console.error('Error in progress handler:', error);
            throw error;
        }
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map