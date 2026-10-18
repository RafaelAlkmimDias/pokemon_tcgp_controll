<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Mandatory: clean up Rust build artifacts

This project is being migrated to a Rust binary (see `pokemon-tcgp/` once it exists). Rust build caches (`target/`, incremental compilation data, `~/.cargo/registry` growth from frequent dependency changes) have caused disk space problems in past projects for this user.

- After a build/test session in the Rust project, run `cargo clean` unless actively iterating on another build within the next few minutes.
- Before any build, check `du -sh target/` if it's been more than a day since the last clean — don't let it grow unnoticed.
- Prefer `cargo check` over `cargo build` when just verifying compilation (no artifacts written beyond minimal metadata).
- Never leave a `target/` directory sitting after a work session ends — clean it as the last step, not something to "do later".
- `target/` must be in `.gitignore` from the first commit of the Rust project.
