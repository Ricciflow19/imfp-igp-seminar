# IMFP-IGP Seminar website

The public website is hosted with GitHub Pages. Upcoming seminar submissions are self-service and use GitHub Issues as the public data source.

## Speaker submission workflow

1. An invited speaker selects an available date on `upcoming.html`.
2. The speaker completes the `talk-submission.yml` GitHub Issue form.
3. `validate-seminar-submission.yml` checks the date and required fields and prevents two published submissions from using the same slot.
4. A valid issue receives the `seminar-published` label. The workflow converts all open, validated issues into `data/submissions.json` and requests a new GitHub Pages build.
5. `seminars.js` reads the same-origin JSON file and displays the talk without making cross-origin API requests from a visitor's browser.
6. Editing the issue updates the website. Closing the issue withdraws the talk.

GitHub's required issue title is only a booking-record label. It is pre-filled from the selected date and is not displayed as the talk title. The speaker enters the actual title in the `Talk title` form field. GitHub Issue Forms can pre-fill but cannot hide or lock their issue-title control, so the form and Upcoming page explain this distinction. Speakers should edit the description of their existing issue to correct details; creating another issue for the same date produces a conflict.

The Upcoming page checks for updated same-origin submissions every 60 seconds while visible, refreshes when the tab becomes visible again, and offers a manual refresh button. Speaker text is still inserted with `textContent`. MathJax then typesets only the resulting page content, using `$...$` or `\(...\)` for inline formulas and `$$...$$` or `\[...\]` for display formulas. The MathJax `ui/safe` extension restricts URLs and styles in speaker-supplied TeX. If the math library fails to load, the schedule remains readable as plain text.

The site creates all displayed content with DOM `textContent`; speaker-supplied HTML is never inserted into the page. Email addresses are deliberately not requested because the submission issue is public.

## Maintaining dates

Available seminar dates are stored in `data/schedule.json`. When adding another semester, update that file. Dates are validated against this list.

The repository must contain these three labels:

- `talk-submission`
- `seminar-published`
- `submission-conflict`
