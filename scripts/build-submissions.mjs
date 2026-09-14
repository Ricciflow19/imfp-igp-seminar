import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSubmission, validateSubmission } from './validate-submission.mjs';

export function buildSubmissions(issues) {
  const submissionsByDate = new Map();

  issues
    .sort((a, b) => a.number - b.number)
    .forEach((issue) => {
      const submission = parseSubmission(issue.body);
      if (!validateSubmission(submission) || submissionsByDate.has(submission.date)) return;

      submissionsByDate.set(submission.date, {
        issueNumber: issue.number,
        issueUrl: issue.url,
        ...submission
      });
    });

  return [...submissionsByDate.values()];
}

export function mergeCurrentIssue(issues, event, status, action) {
  if (!event?.issue) return issues;

  const withoutCurrentIssue = issues.filter((issue) => issue.number !== event.issue.number);
  if (action === 'closed' || status !== 'accepted' || event.issue.state !== 'open') {
    return withoutCurrentIssue;
  }

  return [
    ...withoutCurrentIssue,
    {
      number: event.issue.number,
      url: event.issue.html_url,
      body: event.issue.body
    }
  ];
}

function run() {
  const [, , issuesPath, outputPath, eventPath] = process.argv;
  if (!issuesPath || !outputPath) {
    throw new Error('Expected an issues JSON file and an output JSON file.');
  }

  let issues = JSON.parse(fs.readFileSync(issuesPath, 'utf8'));
  if (eventPath) {
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    issues = mergeCurrentIssue(issues, event, process.env.CURRENT_STATUS || '', process.env.EVENT_ACTION || '');
  }

  const submissions = buildSubmissions(issues);
  fs.writeFileSync(outputPath, `${JSON.stringify(submissions, null, 2)}\n`);
  process.stdout.write(`Generated ${submissions.length} published submission${submissions.length === 1 ? '' : 's'}.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
