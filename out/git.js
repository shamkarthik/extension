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
exports.GitService = void 0;
const cp = __importStar(require("child_process"));
const util = __importStar(require("util"));
const exec = util.promisify(cp.exec);
class GitService {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    async getTodaysChanges() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const midnightISO = today.toISOString();
        // Get current user
        const { stdout: userEmail } = await exec('git config user.email', {
            cwd: this.workspaceRoot
        });
        const email = userEmail.trim();
        // Get today's commits
        const commits = await this.getCommitsSince(midnightISO, email);
        // Get uncommitted changes
        const uncommittedChanges = await this.getUncommittedChanges();
        // Aggregate data
        const totalFiles = new Set();
        let totalInsertions = 0;
        let totalDeletions = 0;
        commits.forEach(commit => {
            commit.filesChanged.forEach(file => totalFiles.add(file));
            totalInsertions += commit.insertions;
            totalDeletions += commit.deletions;
        });
        uncommittedChanges.files.forEach(file => totalFiles.add(file));
        totalInsertions += uncommittedChanges.insertions;
        totalDeletions += uncommittedChanges.deletions;
        return {
            commits,
            uncommittedChanges,
            totalFiles,
            totalInsertions,
            totalDeletions
        };
    }
    async getCommitsSince(since, author) {
        try {
            const { stdout } = await exec(`git log --since="${since}" --author="${author}" --pretty=format:"%H|%an|%aI|%s" --numstat`, { cwd: this.workspaceRoot });
            if (!stdout.trim()) {
                return [];
            }
            const commits = this.parseGitLog(stdout);
            // Fetch diff for each commit
            for (const commit of commits) {
                try {
                    const { stdout: diffOutput } = await exec(`git show ${commit.hash} --format="" --unified=3`, { cwd: this.workspaceRoot });
                    commit.diff = diffOutput;
                }
                catch (error) {
                    console.error(`Error fetching diff for commit ${commit.hash}:`, error);
                    commit.diff = '';
                }
            }
            return commits;
        }
        catch (error) {
            console.error('Error fetching git commits:', error);
            return [];
        }
    }
    parseGitLog(output) {
        const commits = [];
        const lines = output.split('\n');
        let currentCommit = null;
        for (const line of lines) {
            if (line.includes('|')) {
                // Commit header line
                if (currentCommit) {
                    commits.push(currentCommit);
                }
                const [hash, author, date, message] = line.split('|');
                currentCommit = {
                    hash,
                    author,
                    date: new Date(date),
                    message,
                    filesChanged: [],
                    insertions: 0,
                    deletions: 0,
                    diff: '' // Will be populated later
                };
            }
            else if (line.trim() && currentCommit) {
                // Numstat line: insertions deletions filename
                const match = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/);
                if (match) {
                    const [, ins, del, file] = match;
                    currentCommit.filesChanged.push(file);
                    currentCommit.insertions += ins === '-' ? 0 : parseInt(ins);
                    currentCommit.deletions += del === '-' ? 0 : parseInt(del);
                }
            }
        }
        if (currentCommit) {
            commits.push(currentCommit);
        }
        return commits;
    }
    async getUncommittedChanges() {
        try {
            // Get numstat for file list and counts
            const { stdout: numstatOutput } = await exec('git diff --numstat', {
                cwd: this.workspaceRoot
            });
            if (!numstatOutput.trim()) {
                return { files: [], insertions: 0, deletions: 0, diff: '' };
            }
            const files = [];
            let insertions = 0;
            let deletions = 0;
            const lines = numstatOutput.trim().split('\n');
            for (const line of lines) {
                const match = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/);
                if (match) {
                    const [, ins, del, file] = match;
                    files.push(file);
                    insertions += ins === '-' ? 0 : parseInt(ins);
                    deletions += del === '-' ? 0 : parseInt(del);
                }
            }
            // Get actual diff
            const { stdout: diffOutput } = await exec('git diff --unified=3', {
                cwd: this.workspaceRoot
            });
            return { files, insertions, deletions, diff: diffOutput };
        }
        catch (error) {
            console.error('Error fetching uncommitted changes:', error);
            return { files: [], insertions: 0, deletions: 0, diff: '' };
        }
    }
}
exports.GitService = GitService;
//# sourceMappingURL=git.js.map