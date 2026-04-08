import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

interface GitHubUser {
  login: string;
  avatar_url: string;
}

interface GitHubPullRequest {
  number: number;
  title: string;
  html_url: string;
  state: string;
  merged: boolean;
  head: { ref: string };
  user: GitHubUser;
}

interface GitHubCommit {
  id: string;
  message: string;
  url: string;
  author: { name: string; email: string };
  timestamp: string;
}

interface GitHubWebhookPayload {
  action?: string;
  pull_request?: GitHubPullRequest;
  commits?: GitHubCommit[];
  ref?: string;
  repository?: { full_name: string; html_url: string };
  sender?: GitHubUser;
}

/**
 * Extracts issue keys from text (e.g., TRK-42, PROJ-123).
 * Matches the pattern: 2+ uppercase letters, dash, 1+ digits.
 */
function extractIssueKeys(text: string): string[] {
  const matches = text.match(/[A-Z]{2,}-\d+/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Verifies the GitHub webhook signature.
 */
export function verifyGitHubSignature(
  payload: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Resolves issue keys like "TRK-42" to actual issue IDs in the database.
 */
async function resolveIssueKeys(
  keys: string[],
): Promise<Array<{ id: string; projectId: string; title: string; key: string }>> {
  const results: Array<{ id: string; projectId: string; title: string; key: string }> = [];

  for (const key of keys) {
    const [projectKey, numberStr] = key.split('-');
    const number = parseInt(numberStr, 10);
    if (!projectKey || isNaN(number)) continue;

    const issue = await prisma.issue.findFirst({
      where: {
        number,
        project: { key: projectKey },
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        project: { select: { key: true } },
      },
    });

    if (issue) {
      results.push({
        id: issue.id,
        projectId: issue.projectId,
        title: issue.title,
        key: `${issue.project.key}-${number}`,
      });
    }
  }

  return results;
}

/**
 * Handles GitHub pull_request events.
 * Links PRs to issues by extracting issue keys from PR title and branch name.
 */
async function handlePullRequest(payload: GitHubWebhookPayload): Promise<string[]> {
  const pr = payload.pull_request;
  if (!pr) return [];

  const action = payload.action;
  if (!['opened', 'closed', 'reopened', 'synchronize'].includes(action ?? '')) {
    return [];
  }

  // Extract issue keys from PR title and branch name
  const textToSearch = `${pr.title} ${pr.head.ref}`;
  const issueKeys = extractIssueKeys(textToSearch);

  if (issueKeys.length === 0) return [];

  const issues = await resolveIssueKeys(issueKeys);
  const linkedKeys: string[] = [];

  for (const issue of issues) {
    let activityAction: string;
    let activityValue: string;

    if (action === 'opened') {
      activityAction = 'PR_OPENED';
      activityValue = `PR #${pr.number}: ${pr.title}`;
    } else if (action === 'closed' && pr.merged) {
      activityAction = 'PR_MERGED';
      activityValue = `PR #${pr.number} merged: ${pr.title}`;
    } else if (action === 'closed') {
      activityAction = 'PR_CLOSED';
      activityValue = `PR #${pr.number} closed: ${pr.title}`;
    } else if (action === 'reopened') {
      activityAction = 'PR_REOPENED';
      activityValue = `PR #${pr.number} reopened: ${pr.title}`;
    } else {
      continue;
    }

    // Create activity log entry on the issue
    await prisma.activityLog.create({
      data: {
        action: activityAction,
        field: 'github',
        oldValue: null,
        newValue: activityValue,
        issueId: issue.id,
        userId: await resolveGitHubUser(pr.user.login) ?? (await getFirstAdmin()),
      },
    });

    // If PR was merged, add a comment on the issue
    if (action === 'closed' && pr.merged) {
      const adminId = await getFirstAdmin();
      await prisma.comment.create({
        data: {
          content: `Pull request [#${pr.number}](${pr.html_url}) was merged by ${pr.user.login}.\n\n**${pr.title}**`,
          issueId: issue.id,
          authorId: adminId,
        },
      });
    }

    linkedKeys.push(issue.key);
  }

  return linkedKeys;
}

/**
 * Handles GitHub push events.
 * Links commits to issues by extracting issue keys from commit messages.
 */
async function handlePush(payload: GitHubWebhookPayload): Promise<string[]> {
  const commits = payload.commits;
  if (!commits || commits.length === 0) return [];

  const linkedKeys: string[] = [];

  for (const commit of commits) {
    const issueKeys = extractIssueKeys(commit.message);
    if (issueKeys.length === 0) continue;

    const issues = await resolveIssueKeys(issueKeys);

    for (const issue of issues) {
      const shortSha = commit.id.substring(0, 7);
      await prisma.activityLog.create({
        data: {
          action: 'COMMIT',
          field: 'github',
          oldValue: null,
          newValue: `${shortSha}: ${commit.message.split('\n')[0]}`,
          issueId: issue.id,
          userId: await resolveGitHubUser(commit.author.name) ?? (await getFirstAdmin()),
        },
      });

      if (!linkedKeys.includes(issue.key)) {
        linkedKeys.push(issue.key);
      }
    }
  }

  return linkedKeys;
}

/**
 * Try to find a Trackly user matching a GitHub username or email.
 */
async function resolveGitHubUser(nameOrEmail: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: nameOrEmail },
        { name: { contains: nameOrEmail, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * Get the first admin user as a fallback for system actions.
 */
async function getFirstAdmin(): Promise<string> {
  const member = await prisma.workspaceMember.findFirst({
    where: { role: 'ADMIN' },
    select: { userId: true },
  });
  if (!member) {
    const anyUser = await prisma.user.findFirst({ select: { id: true } });
    return anyUser!.id;
  }
  return member.userId;
}

/**
 * Main entry point for processing GitHub webhook events.
 */
export async function processGitHubWebhook(
  event: string,
  payload: GitHubWebhookPayload,
): Promise<{ processed: boolean; linkedIssues: string[] }> {
  let linkedIssues: string[] = [];

  switch (event) {
    case 'pull_request':
      linkedIssues = await handlePullRequest(payload);
      break;
    case 'push':
      linkedIssues = await handlePush(payload);
      break;
    default:
      return { processed: false, linkedIssues: [] };
  }

  return { processed: true, linkedIssues };
}
