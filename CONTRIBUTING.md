# Contributing to Aara Music

Thanks for looking. Aara Music is a React Native (Expo) + TypeScript music streaming app powered by the Deezer API, with a small Node/Express proxy for audio and auth. Contributions of code, docs, and bug reports are all welcome.

## Run it locally

Prerequisites: Node.js LTS and npm. No API keys are needed — Deezer's public API is used directly through the proxy.

```bash
git clone https://github.com/vilaswasnik/aaramusic.ai.git
cd aaramusic.ai
npm install
bash start.sh      # starts the proxy and the Expo web app together
# stop with: bash stop.sh
```

`start.sh` is the supported local entry point — it orchestrates both processes and prints the local URLs. For native development, use the Expo scripts instead (`npm run android`, `npm run ios`, `npm run web:expo`) with the proxy running.

Key facts before you change things:

- The app calls the Deezer API **through the local proxy** (`server/proxy.js`) to avoid CORS. Don't point the client at third-party APIs directly.
- Auth lives in the proxy too. The default admin account is seeded **only** from the `DEFAULT_ADMIN_PASSWORD` environment variable — there is no hardcoded fallback, and there must never be one. If the variable is unset, no admin is created (fail closed).
- Production is Render (`render.yaml`) for the full app; GitHub Pages hosts the static export only, so backend-dependent features can't be tested from the Pages build alone.

## Filing an issue

Use GitHub Issues. A useful bug report includes: the screen/feature, what you did, what you expected, what happened, whether you were on web/iOS/Android, and whether the proxy was running (audio, lyrics, and login all depend on it).

## PR process

1. Fork, branch from `main`, keep the change focused.
2. Match the surrounding TypeScript style; the project is strict-mode (`tsconfig.json`).
3. If you touch the proxy or auth, say so in the PR description and describe how you tested login/audio locally.
4. One approval from the maintainer merges.

## Good first issues

Concrete, evidence-based starting points (each cites where the gap is):

1. **Repair the README's License section.** The `## License` section at the end of `README.md` currently contains a leftover Codespaces URL and the start/stop commands instead of license text. Point it at the repo's LICENSE file.
2. **Delete the `README.backup.md` stub.** It's a 14-byte leftover in the repo root that adds noise to every file listing.
3. **Write the missing `start.sh` explainer.** Local setup depends on a 16 KB orchestration script; a short section in `DEVELOPMENT.md` describing what it starts, on which ports, and what to check when it fails would save every new contributor time.
4. **Document the Cloudflare Worker's status.** `worker/` remains from the pre-Render architecture. Either mark it deprecated in a short note in the folder or remove it, so contributors stop wondering which backend is current.
