# Simple Comments Page

A pure HTML/CSS/JavaScript comment page with local demo registration/login, nested replies, timestamps, and a Web Worker that checks comments against `inappropriate-words.json`.

## Run it

Web Workers and `fetch()` generally do not work when opening `index.html` directly with a `file://` URL. Serve this folder over HTTP instead. For example, if Python is installed:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000> (or change the localhost number according to your preferences).

## Notes

- Accounts and comments are stored in browser `localStorage`; the active login is stored in `sessionStorage`.
- This is intentionally a test/demo implementation. Passwords are stored as plain text in local storage and are not secure. Do not use this authentication design in production.
- The word checker loads its blocklist from `inappropriate-words.json` inside a newly created Web Worker for each comment submission.
- The checker is case-insensitive and blocks the listed word as well as common suffix extensions (for example, plural or inflected forms).
- `iHateWar()` is exposed globally and can be called from the browser console; it displays `I HATE WAR!!!`.
