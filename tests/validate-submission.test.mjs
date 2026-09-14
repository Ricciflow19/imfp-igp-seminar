import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSubmission, submissionStatus, validateSubmission } from '../scripts/validate-submission.mjs';
import { buildSubmissions } from '../scripts/build-submissions.mjs';

function bodyFor(overrides = {}) {
  const values = {
    date: 'September 17, 2026',
    speaker: 'Ada Lovelace',
    institution: 'Example University',
    website: 'https://example.edu/ada',
    title: 'A Mathematical Talk',
    abstract: 'This is a complete abstract.',
    ...overrides
  };

  return `### Seminar date

${values.date}

### Speaker name

${values.speaker}

### Institution or affiliation

${values.institution}

### Personal or professional webpage

${values.website || '_No response_'}

### Talk title

${values.title}

### Talk abstract

${values.abstract}

### Confirmation

- [x] Confirmed`;
}

test('parses all public fields from a GitHub issue form body', () => {
  assert.deepEqual(parseSubmission(bodyFor()), {
    date: 'September 17, 2026',
    speaker: 'Ada Lovelace',
    institution: 'Example University',
    website: 'https://example.edu/ada',
    title: 'A Mathematical Talk',
    abstract: 'This is a complete abstract.'
  });
});

test('accepts a complete submission for a listed date', () => {
  const submission = parseSubmission(bodyFor());
  assert.equal(validateSubmission(submission), true);
  assert.equal(submissionStatus({ number: 10, body: bodyFor() }, []), 'accepted');
});

test('rejects dates not present in the public schedule', () => {
  const issue = { number: 10, body: bodyFor({ date: 'January 1, 2027' }) };
  assert.equal(submissionStatus(issue, []), 'invalid');
});

test('detects a date already held by a different published issue', () => {
  const issue = { number: 10, body: bodyFor() };
  const published = [{ number: 9, body: bodyFor({ speaker: 'Emmy Noether' }) }];
  assert.equal(submissionStatus(issue, published), 'conflict');
});

test('allows the published issue author to edit their own details', () => {
  const issue = { number: 10, body: bodyFor({ title: 'A Revised Title' }) };
  const published = [{ number: 10, body: bodyFor() }];
  assert.equal(submissionStatus(issue, published), 'accepted');
});

test('rejects unsafe personal-page protocols', () => {
  const submission = parseSubmission(bodyFor({ website: 'javascript:alert(1)' }));
  assert.equal(validateSubmission(submission), false);
});

test('builds safe website data from published issues', () => {
  const submissions = buildSubmissions([
    { number: 12, url: 'https://github.com/example/issues/12', body: bodyFor() }
  ]);

  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].issueNumber, 12);
  assert.equal(submissions[0].speaker, 'Ada Lovelace');
  assert.equal(submissions[0].issueUrl, 'https://github.com/example/issues/12');
});

test('website data keeps the earliest issue if duplicate dates are present', () => {
  const submissions = buildSubmissions([
    { number: 14, url: 'https://github.com/example/issues/14', body: bodyFor({ speaker: 'Later Speaker' }) },
    { number: 13, url: 'https://github.com/example/issues/13', body: bodyFor({ speaker: 'First Speaker' }) }
  ]);

  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].issueNumber, 13);
  assert.equal(submissions[0].speaker, 'First Speaker');
});
