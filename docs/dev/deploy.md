# Deploy

| | |
| --- | --- |
| Public URL | https://nekokaii.com/showcase-generator |
| Source | https://github.com/nekokaii/character-showcase-studio |
| Host | Cloudflare Worker `character-showcase-studio` (owner nekokaii's Cloudflare account) |

## How it is wired

- `wrangler.jsonc` routes `nekokaii.com/showcase-generator` and `/showcase-generator/*` to this Worker. The site's other routes (home page, DNS, `/studio*`) belong to other projects and must not be touched.
- `wrangler deploy` runs `tools/build-cloudflare.mjs`. That runs the normal build, then copies `dist/index.html` into `dist-cloudflare/` (gitignored). That one file is the only uploaded asset.
- `tools/cloudflare-worker.mjs` answers only `GET` / `HEAD` on the public path, or `/` on `*.workers.dev`, and returns 404 or 405 for anything else. It requests `/` from the assets binding internally, because asset hosting redirects `/index.html` → `/`, and that redirect must not escape the `/showcase-generator` mount. It sets `Cache-Control: no-cache` and `X-Content-Type-Options: nosniff`.

## Deploying

**Deploying is manual and separate from GitHub.** Pushing or merging does not deploy. Only someone logged in to the owner's Cloudflare account can deploy:

```sh
npx wrangler login
npx wrangler deploy
```

Rules:
- Deploy only from an up-to-date `main` with a clean working tree and a passing `node tools/check.mjs`.
- Deploying changes the public site. An agent must get the owner's explicit approval before every deploy.
- Never commit `.wrangler/`, `.dev.vars`, `.env*` or any token. They are gitignored. `account_id` in `wrangler.jsonc` is an identifier, not a secret.
- Users' saved settings are keyed by page path (see [state-and-timing.md](state-and-timing.md#storage)). Changing the route loses them.

To change the default look visitors see the first time, update `runtime/startup-defaults.json` and its `revision` (see [state-and-timing.md](state-and-timing.md#startup-preset)).
