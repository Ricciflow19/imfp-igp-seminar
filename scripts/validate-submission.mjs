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

export function submissionValidationError(submission) {
  if (!allowedDates.has(submission.date)) return 'The Seminar date must exactly match a date on the Upcoming Seminars page.';
  if (!submission.speaker || submission.speaker.length > 120) return 'Speaker name is required and must be at most 120 characters.';
  if (!submission.institution || submission.institution.length > 200) return 'Institution or affiliation is required and must be at most 200 characters.';
  if (!submission.title || submission.title.length > 300) return 'Talk title is required and must be at most 300 characters.';
  if (!submission.abstract || submission.abstract.length > 8000) return 'Talk abstract is required and must be at most 8000 characters.';
  if (submission.website.length > 500 || !validWebsite(submission.website)) return 'Personal or professional webpage must be a full http:// or https:// URL, or be left blank. Do not put the talk title in that field.';
  return '';
}

export function validateSubmission(submission) {
  return !submissionValidationError(submission);
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
  const submission = parseSubmission(event.issue.body);
  process.stdout.write(`status=${submissionStatus(event.issue, publishedIssues)}\n`);
  process.stdout.write(`reason=${submissionValidationError(submission)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
