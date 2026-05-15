# MSC.AI Feedback Archive

This directory is the permanent, repo-tracked archive for CEO/team feedback exports.

The deployed Express server blocks `/feedback-archive/*`, so these JSON files can live in the repo without being served as public site assets.

## Archive From Decisions Export

Use this when the browser decision panel has exported a file such as `msc-feedback-2026-04-24.json`:

```bash
npm run archive:feedback -- --input ~/Downloads/msc-feedback-2026-04-24.json --date 2026-04-24
```

## Archive From Feedback API

Use this when you have a read token for the deployed site or a local server:

```bash
FEEDBACK_ARCHIVE_URL=https://msc-ux-audit-production.up.railway.app/api/feedback \
FEEDBACK_READ_TOKEN=<read-token> \
npm run archive:feedback -- --date 2026-04-24
```

For a local server, omit `FEEDBACK_ARCHIVE_URL` to use `http://127.0.0.1:8080/api/feedback`, or pass `--url`.

## Output

The script writes:

- `msc-feedback-YYYY-MM-DD.json`: normalized archive payload compatible with the decision-panel import shape.
- `manifest.json`: index of archived files.

Do not hand-edit archived JSON unless you are repairing malformed historical data and record that repair in the commit message.
