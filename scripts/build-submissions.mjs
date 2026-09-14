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

function run() {
  const [, , issuesPath, outputPath] = process.argv;
  if (!issuesPath || !outputPath) {
    throw new Error('Expected an issues JSON file and an output JSON file.');
  }

  const issues = JSON.parse(fs.readFileSync(issuesPath, 'utf8'));
  const submissions = buildSubmissions(issues);
  fs.writeFileSync(outputPath, `${JSON.stringify(submissions, null, 2)}\n`);
  process.stdout.write(`Generated ${submissions.length} published submission${submissions.length === 1 ? '' : 's'}.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
