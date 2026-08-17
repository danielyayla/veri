/**
 * "Report an Issue" (WO-031, REQ-014): the Help-menu action opens the browser
 * on a prefilled new-issue URL. GitHub issue forms prefill inputs from query
 * params keyed by field id, so the ids here must match
 * .github/ISSUE_TEMPLATE/bug_report.yml.
 */
export const REPO_ISSUES_NEW = 'https://github.com/danielyayla/veri/issues/new';

export function buildIssueUrl(appVersion: string, macosVersion: string): string {
  const params = new URLSearchParams({
    template: 'bug_report.yml',
    'app-version': appVersion,
    'macos-version': macosVersion,
  });
  return `${REPO_ISSUES_NEW}?${params.toString()}`;
}
