import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schedule = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data', 'schedule.json'), 'utf8'));
const allowedDates = new Set(schedule.map((slot) => slot.display));

export function readField(body, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = body.match(new RegExp(`(?:^|\\n)###\\s+${escapedLabel}\\s*\\n+([\\s\\S]*?)(?=\\n###\\s+|$)`, 'i'));
  if (!match) return '';
  const value = match[1].trim();
  return value === '_No response_' ? '' : value;
}

export function parseSubmission(body = '') {
  return {
    date: readField(body, 'Seminar date'),
    speaker: readField(body, 'Speaker name'),
    institution: readField(body, 'Institution or affiliation'),
    website: readField(body, 'Personal or professional webpage'),
    title: readField(body, 'Talk title'),
    abstract: readField(body, 'Talk abstract')
  };
}

function validWebsite(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateSubmission(submission) {
  if (!allowedDates.has(submission.date)) return false;
  if (!submission.speaker || submission.speaker.length > 120) return false;
  if (!submission.institution || submission.institution.length > 200) return false;
  if (!submission.title || submission.title.length > 300) return false;
  if (!submission.abstract || submission.abstract.length > 8000) return false;
  if (submission.website.length > 500 || !validWebsite(submission.website)) return false;
  return true;
}

export function submissionStatus(issue, publishedIssues) {
  const submission = parseSubmission(issue.body);
  if (!validateSubmission(submission)) return 'invalid';

  const conflictingIssue = publishedIssues.find((candidate) => {
    if (candidate.number === issue.number) return false;
    return parseSubmission(candidate.body).date === submission.date;
  });

  return conflictingIssue ? 'conflict' : 'accepted';
}

function run() {
  const [, , eventPath, publishedIssuesPath] = process.argv;
  if (!eventPath || !publishedIssuesPath) {
    throw new Error('Expected a GitHub event file and a published-issues file.');
  }

  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const publishedIssues = JSON.parse(fs.readFileSync(publishedIssuesPath, 'utf8'));
  process.stdout.write(`status=${submissionStatus(event.issue, publishedIssues)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
