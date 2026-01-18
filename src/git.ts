import * as cp from 'child_process';
import * as util from 'util';

const exec = util.promisify(cp.exec);

export interface GitCommit {
    hash: string;
    author: string;
    date: Date;
    message: string;
    filesChanged: string[];
    insertions: number;
    deletions: number;
    diff: string; // Actual code diff
}

export interface GitData {
    commits: GitCommit[];
    uncommittedChanges: {
        files: string[];
        insertions: number;
        deletions: number;
        diff: string; // Actual uncommitted diff
    };
    totalFiles: Set<string>;
    totalInsertions: number;
    totalDeletions: number;
}

export class GitService {
    constructor(private workspaceRoot: string) { }

    async getTodaysChanges(): Promise<GitData> {
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
        const totalFiles = new Set<string>();
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

    private async getCommitsSince(since: string, author: string): Promise<GitCommit[]> {
        try {
            const { stdout } = await exec(
                `git log --since="${since}" --author="${author}" --pretty=format:"%H|%an|%aI|%s" --numstat`,
                { cwd: this.workspaceRoot }
            );

            if (!stdout.trim()) {
                return [];
            }

            const commits = this.parseGitLog(stdout);

            // Fetch diff for each commit
            for (const commit of commits) {
                try {
                    const { stdout: diffOutput } = await exec(
                        `git show ${commit.hash} --format="" --unified=3`,
                        { cwd: this.workspaceRoot }
                    );
                    commit.diff = diffOutput;
                } catch (error) {
                    console.error(`Error fetching diff for commit ${commit.hash}:`, error);
                    commit.diff = '';
                }
            }

            return commits;
        } catch (error) {
            console.error('Error fetching git commits:', error);
            return [];
        }
    }

    private parseGitLog(output: string): GitCommit[] {
        const commits: GitCommit[] = [];
        const lines = output.split('\n');
        let currentCommit: Partial<GitCommit> | null = null;

        for (const line of lines) {
            if (line.includes('|')) {
                // Commit header line
                if (currentCommit) {
                    commits.push(currentCommit as GitCommit);
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
            } else if (line.trim() && currentCommit) {
                // Numstat line: insertions deletions filename
                const match = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/);
                if (match) {
                    const [, ins, del, file] = match;
                    currentCommit.filesChanged!.push(file);
                    currentCommit.insertions! += ins === '-' ? 0 : parseInt(ins);
                    currentCommit.deletions! += del === '-' ? 0 : parseInt(del);
                }
            }
        }

        if (currentCommit) {
            commits.push(currentCommit as GitCommit);
        }

        return commits;
    }

    private async getUncommittedChanges(): Promise<{
        files: string[];
        insertions: number;
        deletions: number;
        diff: string;
    }> {
        try {
            // Get numstat for file list and counts
            const { stdout: numstatOutput } = await exec('git diff --numstat', {
                cwd: this.workspaceRoot
            });

            if (!numstatOutput.trim()) {
                return { files: [], insertions: 0, deletions: 0, diff: '' };
            }

            const files: string[] = [];
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
        } catch (error) {
            console.error('Error fetching uncommitted changes:', error);
            return { files: [], insertions: 0, deletions: 0, diff: '' };
        }
    }
}
