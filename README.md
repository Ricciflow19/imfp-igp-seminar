# IMFP-IGP Seminar website

The public website is hosted with GitHub Pages. Upcoming seminar submissions are self-service and use GitHub Issues as the public data source.

## Speaker submission workflow

1. An invited speaker selects an available date on `upcoming.html`.
2. The speaker completes the `talk-submission.yml` GitHub Issue form.
3. `validate-seminar-submission.yml` checks the date and required fields and prevents two published submissions from using the same slot.
4. A valid issue receives the `seminar-published` label. `seminars.js` reads those open issues and displays the talk automatically.
5. Editing the issue updates the website. Closing the issue withdraws the talk.

The site creates all displayed content with DOM `textContent`; speaker-supplied HTML is never inserted into the page. Email addresses are deliberately not requested because the submission issue is public.

## Maintaining dates

Available seminar dates are stored in `data/schedule.json`. When adding another semester, update that file. Dates are validated against this list.

The repository must contain these three labels:

- `talk-submission`
- `seminar-published`
- `submission-conflict`
