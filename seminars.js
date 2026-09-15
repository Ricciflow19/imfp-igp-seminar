'use strict';

const SCHEDULE_URL = 'data/schedule.json';
const SUBMISSIONS_URL = 'data/submissions.json';
const SUBMISSION_FORM_URL = 'https://github.com/Ricciflow19/imfp-igp-seminar/issues/new';
const REFRESH_INTERVAL_MS = 60_000;

let lastScheduleSignature = '';
let hasLoadedSchedule = false;
let refreshInProgress = false;
let mathRenderPromise = Promise.resolve();

function safeWebsite(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function submissionFormUrl(date) {
  const url = new URL(SUBMISSION_FORM_URL);
  url.searchParams.set('template', 'talk-submission.yml');
  url.searchParams.set('title', `Seminar booking record — ${date} (not the talk title)`);
  url.searchParams.set('seminar-date', date);
  return url.toString();
}

function appendTextElement(parent, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function createScheduledCard(slot, submission) {
  const item = document.createElement('li');
  item.className = 'scheduled-seminar';
  appendTextElement(item, 'p', 'date', slot.display);

  const author = document.createElement('p');
  author.className = 'author';
  if (submission.website) {
    const speakerLink = document.createElement('a');
    speakerLink.href = submission.website;
    speakerLink.textContent = submission.speaker;
    speakerLink.rel = 'noopener noreferrer';
    author.append(speakerLink);
  } else {
    author.textContent = submission.speaker;
  }
  item.append(author);

  if (submission.institution) {
    appendTextElement(item, 'p', 'institution', submission.institution);
  }
  appendTextElement(item, 'p', 'title', submission.title);
  appendTextElement(item, 'p', 'abstract', submission.abstract);

  const actions = document.createElement('p');
  actions.className = 'submission-actions';
  const editLink = document.createElement('a');
  editLink.href = submission.issueUrl;
  editLink.textContent = 'Edit or withdraw this submission';
  actions.append(editLink);
  item.append(actions);
  return item;
}

function createAvailableCard(slot) {
  const item = document.createElement('li');
  item.className = 'available-seminar';
  appendTextElement(item, 'p', 'date', slot.display);
  appendTextElement(item, 'p', 'author', 'Available slot');
  appendTextElement(item, 'p', 'title', 'Speaker submissions open');

  const description = document.createElement('p');
  description.className = 'abstract';
  description.append('Invited speakers may reserve this date and publish their talk information using the ');
  const link = document.createElement('a');
  link.href = submissionFormUrl(slot.display);
  link.textContent = 'online submission form';
  description.append(link, '.');
  item.append(description);
  return item;
}

function isCompleteSubmission(submission) {
  return Boolean(submission.date && submission.speaker && submission.title && submission.abstract);
}

function typesetSchedule(list) {
  const mathJax = window.MathJax;
  if (!mathJax?.typesetPromise) return;

  mathRenderPromise = mathRenderPromise
    .catch(() => {})
    .then(() => mathJax.startup?.promise)
    .then(() => mathJax.typesetPromise([list]))
    .catch(() => {
      // A failed math render must not hide the seminar itself.
    });
}

async function loadSchedule() {
  const [scheduleResponse, submissionsResponse] = await Promise.all([
    fetch(SCHEDULE_URL, { cache: 'no-cache' }),
    fetch(`${SUBMISSIONS_URL}?updated=${Date.now()}`, { cache: 'no-store' })
  ]);

  if (!scheduleResponse.ok || !submissionsResponse.ok) {
    throw new Error('The live schedule could not be loaded.');
  }

  const schedule = await scheduleResponse.json();
  const submissions = await submissionsResponse.json();
  const signature = JSON.stringify([schedule, submissions]);
  const scheduledDates = new Set(schedule.map((slot) => slot.display));
  const submissionsByDate = new Map();

  submissions
    .sort((a, b) => a.issueNumber - b.issueNumber)
    .map((submission) => ({ ...submission, website: safeWebsite(submission.website) }))
    .filter((submission) => isCompleteSubmission(submission) && scheduledDates.has(submission.date))
    .forEach((submission) => {
      if (!submissionsByDate.has(submission.date)) {
        submissionsByDate.set(submission.date, submission);
      }
    });

  if (signature !== lastScheduleSignature) {
    const list = document.getElementById('seminar-list');
    const fragment = document.createDocumentFragment();
    for (const slot of schedule) {
      const submission = submissionsByDate.get(slot.display);
      fragment.append(submission ? createScheduledCard(slot, submission) : createAvailableCard(slot));
    }

    await mathRenderPromise;
    window.MathJax?.typesetClear?.([list]);
    list.replaceChildren(fragment);
    lastScheduleSignature = signature;
    typesetSchedule(list);
  }

  const status = document.getElementById('schedule-status');
  status.classList.remove('error-message');
  status.textContent = submissionsByDate.size
    ? `${submissionsByDate.size} seminar${submissionsByDate.size === 1 ? '' : 's'} currently scheduled.`
    : 'All listed dates are currently available.';
}

async function refreshSchedule(announce = false) {
  if (refreshInProgress) return;
  refreshInProgress = true;
  const button = document.getElementById('schedule-refresh');
  const status = document.getElementById('schedule-status');
  button.disabled = true;
  if (announce) status.textContent = 'Checking for schedule updates…';

  try {
    await loadSchedule();
    hasLoadedSchedule = true;
  } catch {
    status.textContent = hasLoadedSchedule
      ? 'Could not check for updates. The last loaded schedule remains visible.'
      : 'The live schedule is temporarily unavailable. Please try again shortly.';
    status.classList.add('error-message');
  } finally {
    button.disabled = false;
    refreshInProgress = false;
  }
}

document.getElementById('schedule-refresh').addEventListener('click', () => refreshSchedule(true));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshSchedule();
});
window.setInterval(() => {
  if (!document.hidden) refreshSchedule();
}, REFRESH_INTERVAL_MS);

refreshSchedule();
