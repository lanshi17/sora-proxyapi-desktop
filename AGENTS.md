# AGENTS.md

## Purpose
This file defines the operating rules for agentic coding agents working in this repository.
Use it as the source of truth for project layout, commands, style, verification, and delivery expectations.

## Current Repository State
- Repository root: `/mnt/data/Projects/Applications/Desktop/sora_desktop`
- Current stack: **Tauri 2 + React + TypeScript + Vite + Vitest**
- Desktop shell lives in `src-tauri/`
- Frontend app lives in `src/`
- Tests live in `tests/`
- Packaging helper script exists at `scripts/build-macos-app.sh`
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` were found
- The product is now structured as a **Generate-first Linxi Video Studio** with top-level `Generate`, `Iterate`, and `Storyboard` modes.
- `Generate` is the active working mode and currently supports local image selection, png.cm upload, Linxi create/query flow, recent jobs, and result preview/download wiring.
- `Iterate` is now a functional workspace that supports video selection from recent jobs and remix generation via POST /v1/videos/{id}/remix.
- `Storyboard` is now a functional workspace that supports multi-shot generation where each shot can be generated independently or all at once.
- The image picker supports both real Tauri runtime selection and a plain-browser fallback for local development.

## Clarification Rule
- Any unclear or underspecified requirement must be clarified before implementation.
- Do not silently assume API shapes, auth methods, upload payload formats, response contracts, or deployment targets.
- If multiple reasonable interpretations exist, stop and ask.
- If a requested change conflicts with this file, clarify before proceeding.

## Required Repository Layout
- All business logic must live under `src/`.
- Only the main desktop/bootstrap entrypoints may live outside `src/` when required by Tauri.
- All documentation must live under `docs/`.
- All tests must live under `tests/`.
- All scripts must live under `scripts/`.
- All database-related files must live under `database/` if a database is added later.
- Runtime logs must live under `logs/` if file logging is introduced later.

## Standard Directory Contract
```text
./
├── AGENTS.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
├── src-tauri/
├── tests/
├── docs/
├── scripts/
├── progress.txt
├── lesson.md
└── .gitignore
```

## Commands
These commands are derived from the current checked-in project configuration.

### Install dependencies
```bash
npm install
```

### Run frontend dev server
```bash
npm run dev
```

### Run all tests
```bash
npm test
```

### Run a single test file
```bash
npm run test -- tests/unit/app-shell.test.tsx
npm run test -- tests/unit/settings-form.test.tsx
npm run test -- tests/unit/generation-form.test.tsx
npm run test -- tests/unit/image-picker.test.tsx
npm run test -- tests/unit/build-config.test.ts
```

### Run the frontend build
```bash
npm run build
```

### Run Tauri CLI directly
```bash
npm run tauri -- --help
```

### Run the macOS packaging helper
```bash
npm run build:macos
```

## Verified Command Status
- `npm test` currently passes.
- `npm run build` currently passes.
- `npm run tauri build -- --bundles app` does **not** work in the current Linux environment; the CLI rejected `app` as an invalid bundle value here.
- Treat macOS `.app` bundling as environment-dependent until verified on macOS or with a correct cross-build strategy.

## Technology Conventions
- Frontend: React function components with TypeScript.
- Test framework: Vitest + Testing Library.
- Desktop integration: Tauri 2.
- Tauri dialog usage: `@tauri-apps/plugin-dialog` on the JS side and `tauri_plugin_dialog::init()` on the Rust side.
- Vite/Vitest config should use `defineConfig` from `vitest/config` when a `test` block is present.

## Code Organization Rules
- App composition belongs in `src/app/`.
- Feature-specific code belongs in `src/features/<feature-name>/`.
- Shared HTTP/client utilities belong in `src/lib/`.
- Reusable presentational components belong in `src/components/`.
- Keep tests near their domain under `tests/unit/` or `tests/integration/`.
- Do not place production business logic in `tests/`, `docs/`, or `scripts/`.

## Import and Formatting Rules
- Group imports in this order: third-party packages, then local application imports.
- Prefer named imports unless a framework convention requires otherwise.
- Keep formatting consistent with the existing TypeScript/React files.
- Use semicolon-terminated statements to match current code.
- Avoid dead imports; `noUnusedLocals` is enabled.

## Type Safety Rules
- Use explicit interfaces/types for public props, settings objects, upload types, and API contracts.
- Keep form payloads and client payloads strongly typed.
- Do not suppress type errors with `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Narrow unknown server responses before using them.
- Keep validation logic close to the boundary where data enters the system.

## Naming Rules
- Use descriptive feature-oriented filenames such as `SettingsForm.tsx`, `GenerationForm.tsx`, and `ImagePicker.tsx`.
- Prefer domain names over generic names like `utils.ts` or `helpers.ts`.
- Test names should describe observable behavior.
- Use clear prop names like `selectedImages`, `onSubmit`, and `uploadEndpoint`.

## UI and Feature Rules
- Keep components focused and small.
- Do not add future-task behavior early.
- The image picker must stay Tauri-backed rather than browser-only.
- Do not send local file paths directly to linxi.chat.
- Upload local assets first, then send returned public URLs to the linxi create endpoint.

## Error Handling Rules
- Do not swallow exceptions.
- Do not use empty catch blocks.
- Convert network and parsing failures into user-safe error messages with technical detail preserved for debugging.
- Never log raw API keys or secrets.
- Redact sensitive headers and tokens from debug output.

## Testing Rules
- New behavior should ship with tests unless the user explicitly says otherwise.
- Follow TDD when implementing new functionality: failing test first, then minimal code, then re-verify.
- Prefer unit tests for forms, payload building, response normalization, and state transitions.
- Prefer integration tests for multi-step workflow behavior.
- Report the exact commands used for verification when finishing work.

## Packaging Rules
- Packaging configuration lives in `src-tauri/tauri.conf.json` and `scripts/build-macos-app.sh`.
- The helper script currently targets `universal-apple-darwin`.
- Do not claim `.app` packaging works unless it has been verified from a compatible macOS build environment.

## Progress and Retrospective Tracking
- After each completed task node, append a concise status entry to `progress.txt`.
- Each entry should say what changed, why it changed, and the current state.
- Record debugging attempts and root-cause findings in `lesson.md`.
- Do not skip documenting failed investigations that taught something important.

## Version Control Rules
- Do not commit unless the user explicitly asks.
- Do not rewrite history unless the user explicitly asks.
- Prefer small, reviewable changes.
- Keep unrelated work out of the same patch.

## Cursor and Copilot Rules
- No Cursor rules were found in `.cursor/rules/` or `.cursorrules`.
- No Copilot instructions were found in `.github/copilot-instructions.md`.
- If those files are added later, merge their repository-specific instructions into this document and resolve conflicts explicitly.

## Verification Before Completion
- Do not claim success without fresh command output.
- Run the relevant tests/builds before closing a task and report the exact commands used.
- If work is blocked by missing external API details, state that plainly.
- If an environment-specific command fails because of platform constraints, record that exact failure instead of guessing.

## Implemented Capabilities

### Model Catalog
- **Sora**: sora-2, sora-2-pro (with remix support)
- **Grok**: grok-video-3
- **Luma**: ray-v1, ray-v2 (with extend support)
- **Kling**: kling-v1, kling-v1-6, kling-v2, kling-v2-6
- **Runway**: gen4_turbo, gen3a_turbo
- Future models: veo, seedance (placeholder, available: false)

### API Endpoints
- POST /v1/videos - Create video generation
- GET /v1/videos/{id} - Query generation status
- POST /v1/videos/{id}/remix - Remix existing video (Iterate mode)
- POST /luma/generations/{task_id}/extend - Extend video (future)

### Workflows
- **Generate Mode**: Full image upload → video generation → result download
- **Iterate Mode**: Select completed video → remix with new prompt → view result
- **Storyboard Mode**: Create multiple shots → generate individually or all at once
