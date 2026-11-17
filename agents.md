# AGENTS.md

## Goal

Work efficiently and minimize unnecessary context usage.

Prioritize small, targeted changes over broad repository exploration or unrelated refactoring.

## Context efficiency

- Inspect only files that are relevant to the current task.
- Do not scan the entire repository unless explicitly necessary.
- Prefer targeted file searches over reading full directories.
- Do not repeatedly reopen files unless their contents may have changed.
- Avoid reading large generated files.
- Ignore unnecessary folders such as:
  - `node_modules/`
  - `dist/`
  - `build/`
  - `.astro/`
  - `.next/`
  - `coverage/`
  - `.git/`
- Do not inspect lock files unless dependency changes are required.
- Avoid loading large assets, binaries, images, or generated files unless directly relevant.
- Reuse information already discovered during the current task instead of searching for it again.

## Scope

- Make the smallest change that correctly solves the task.
- Do not modify unrelated files.
- Do not refactor unrelated code.
- Do not rename files, variables, components, or APIs unless necessary.
- Preserve the existing project structure and coding style.
- Do not introduce new abstractions unless they clearly simplify the requested change.

## Before editing

Before making changes:

1. Identify the smallest set of files likely involved.
2. Inspect those files first.
3. Expand the search only if the necessary information is not there.
4. Avoid broad repository exploration unless the task genuinely requires it.

## Dependencies

- Do not add, remove, or upgrade dependencies unless necessary.
- Prefer existing project dependencies and APIs.
- Do not modify `package-lock.json` unless a dependency change requires it.
- Ask before introducing a major dependency or framework.

## Testing

- Run only tests relevant to the modified code first.
- Do not run the entire test suite unless necessary.
- Prefer targeted linting, type checking, or tests where possible.
- Do not repeatedly run the same expensive command unless the code changed.
- Use the project's existing scripts instead of inventing new test commands.

## Commands

Prefer the existing commands defined in `package.json`.

Common commands may include:

```bash
npm run dev
npm run build
npm run lint
npm run test
```

Check `package.json` before assuming a command exists.

## Astro / React

When working with Astro or React:

- Prefer existing components before creating new ones.
- Keep component changes local when possible.
- Do not move logic between components unless necessary.
- Preserve existing styling conventions.
- Avoid changing global CSS for a local visual change when component-level styling is sufficient.
- Do not convert Astro components to React, or React components to Astro, unless the task requires it.

## Code quality

- Match the existing code style.
- Keep implementations simple.
- Avoid unnecessary comments.
- Avoid duplicated logic when a small existing utility can be reused.
- Do not over-engineer.
- Preserve backwards compatibility unless the task explicitly requires a breaking change.

## Git / repository safety

- Do not delete files unless explicitly required.
- Do not overwrite user work unrelated to the current task.
- Do not modify environment files or secrets.
- Do not expose values from `.env` files.
- Do not commit or push unless explicitly asked.

## Communication

When completing a task:

- Briefly state which files were changed.
- Explain any important behavior change.
- Mention tests or checks that were run.
- Avoid long summaries unless requested.

## Priority

When instructions conflict, use this priority:

1. Explicit user request.
2. Existing project requirements and architecture.
3. This `AGENTS.md`.
4. General best practices.

The main principle is:

**Solve the requested task correctly while touching and reading as little unrelated code as possible.**