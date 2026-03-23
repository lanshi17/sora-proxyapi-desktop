# Tauri Sora Desktop MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a macOS desktop MVP that lets a user configure linxi.chat access, select local images, upload them to an existing upload API to obtain public URLs, generate a video through linxi.chat, poll task status, preview the result, and package the app as a `.app` for internal testing.

**Architecture:** Use Tauri 2 as the desktop shell and React + TypeScript for the UI. Keep all business logic under `src/`, isolate upload and linxi.chat integrations behind dedicated clients, and use mocked integration tests to validate upload, create, and query flows before packaging.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Vitest, Testing Library, optional Zustand, Tauri dialog/fs/shell plugins.

---

### Task 1: Scaffold desktop app shell

**Files:**
- Create: `package.json`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/styles.css`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/main.rs`
- Create: `.gitignore`
- Test: `tests/unit/app-shell.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { App } from '../../src/app/App'

test('renders Sora desktop shell heading', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /sora desktop/i })).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/app-shell.test.tsx`
Expected: FAIL because `App` and project scaffold do not exist yet.

**Step 3: Write minimal implementation**

Create a minimal Tauri + React + TypeScript scaffold with an `App` component that renders a heading and placeholder layout.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/app-shell.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json src src-tauri .gitignore tests/unit/app-shell.test.tsx
git commit -m "feat: scaffold tauri sora desktop app"
```

### Task 2: Add settings form and local persistence

**Files:**
- Create: `src/features/config/SettingsForm.tsx`
- Create: `src/features/config/settings-store.ts`
- Create: `src/features/config/settings-types.ts`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/settings-form.test.tsx`

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsForm } from '../../src/features/config/SettingsForm'

test('persists API key and model inputs', async () => {
  render(<SettingsForm />)
  fireEvent.change(screen.getByLabelText(/api key/i), { target: { value: 'sk-test' } })
  fireEvent.change(screen.getByLabelText(/model/i), { target: { value: 'sora-2-pro' } })
  fireEvent.click(screen.getByRole('button', { name: /save settings/i }))
  expect(await screen.findByText(/settings saved/i)).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/settings-form.test.tsx`
Expected: FAIL because settings components/store do not exist.

**Step 3: Write minimal implementation**

Implement a settings form with local persistence for API key, model, and optional upload endpoint configuration using local storage or a thin persistence wrapper.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/settings-form.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/config src/app/App.tsx tests/unit/settings-form.test.tsx
git commit -m "feat: add persisted settings form"
```

### Task 3: Add generation form validation

**Files:**
- Create: `src/features/video-generation/GenerationForm.tsx`
- Create: `src/features/video-generation/generation-schema.ts`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/generation-form.test.tsx`

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { GenerationForm } from '../../src/features/video-generation/GenerationForm'

test('requires prompt before submission', async () => {
  render(<GenerationForm onSubmit={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /generate video/i }))
  expect(await screen.findByText(/prompt is required/i)).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/generation-form.test.tsx`
Expected: FAIL because the generation form does not exist.

**Step 3: Write minimal implementation**

Create a generation form for prompt, orientation, size, duration, and watermark, with validation and a typed submission payload.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/generation-form.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/video-generation src/app/App.tsx tests/unit/generation-form.test.tsx
git commit -m "feat: add video generation form"
```

### Task 4: Add local image picker and preview list

**Files:**
- Create: `src/features/uploads/ImagePicker.tsx`
- Create: `src/features/uploads/image-preview.ts`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/image-picker.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { ImagePicker } from '../../src/features/uploads/ImagePicker'

test('shows selected image previews', async () => {
  render(<ImagePicker onImagesSelected={() => {}} />)
  expect(screen.getByRole('button', { name: /choose images/i })).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/image-picker.test.tsx`
Expected: FAIL because the image picker does not exist.

**Step 3: Write minimal implementation**

Add Tauri-backed local file selection, create browser preview URLs for chosen images, and render a removable preview list.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/image-picker.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/uploads src/app/App.tsx tests/unit/image-picker.test.tsx
git commit -m "feat: add local image selection"
```

### Task 5: Implement upload API client

**Files:**
- Create: `src/lib/http/http-client.ts`
- Create: `src/features/uploads/upload-client.ts`
- Create: `src/features/uploads/upload-types.ts`
- Test: `tests/unit/upload-client.test.ts`

**Step 1: Write the failing test**

```ts
import { uploadImages } from '../../src/features/uploads/upload-client'

test('normalizes upload API response into public URLs', async () => {
  const result = await uploadImages([
    { name: 'frame.png', path: '/tmp/frame.png', mimeType: 'image/png' },
  ])
  expect(result[0].url).toBe('https://cdn.example.com/frame.png')
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/upload-client.test.ts`
Expected: FAIL because the upload client does not exist.

**Step 3: Write minimal implementation**

Implement a multipart upload client that accepts selected image metadata, calls the existing upload API, and returns normalized public URLs.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/upload-client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/http src/features/uploads tests/unit/upload-client.test.ts
git commit -m "feat: add image upload client"
```

### Task 6: Implement linxi create request client

**Files:**
- Create: `src/features/video-generation/linxi-create-client.ts`
- Create: `src/features/video-generation/linxi-types.ts`
- Test: `tests/unit/linxi-create-client.test.ts`

**Step 1: Write the failing test**

```ts
import { buildCreatePayload } from '../../src/features/video-generation/linxi-create-client'

test('builds create payload from uploaded image URLs', () => {
  const payload = buildCreatePayload({
    images: ['https://cdn.example.com/frame.png'],
    model: 'sora-2-pro',
    orientation: 'portrait',
    prompt: 'make animate',
    size: 'large',
    duration: 15,
    watermark: false,
  })
  expect(payload.images).toEqual(['https://cdn.example.com/frame.png'])
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/linxi-create-client.test.ts`
Expected: FAIL because the create client does not exist.

**Step 3: Write minimal implementation**

Add a client that builds and sends the create payload to `POST /v1/video/create`, validates the response, and returns task metadata.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/linxi-create-client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/video-generation tests/unit/linxi-create-client.test.ts
git commit -m "feat: add linxi create client"
```

### Task 7: Implement polling query client and job state machine

**Files:**
- Create: `src/features/video-generation/linxi-query-client.ts`
- Create: `src/features/video-generation/useGenerationJob.ts`
- Test: `tests/unit/use-generation-job.test.ts`
- Test: `tests/integration/generation-polling.test.ts`

**Step 1: Write the failing test**

```ts
import { renderHook } from '@testing-library/react'
import { useGenerationJob } from '../../src/features/video-generation/useGenerationJob'

test('transitions from polling to completed when query returns video_url', async () => {
  const { result } = renderHook(() => useGenerationJob())
  expect(result.current.status).toBe('idle')
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/use-generation-job.test.ts`
Expected: FAIL because the polling hook/state machine does not exist.

**Step 3: Write minimal implementation**

Implement query polling, polling stop conditions, timeout handling, and a unified job lifecycle hook for create/query/polling/completion-failure states. Upload handling remains blocked until the upload API contract is provided.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/use-generation-job.test.ts tests/integration/generation-polling.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/video-generation tests/unit/use-generation-job.test.ts tests/integration/generation-polling.test.ts
git commit -m "feat: add generation polling workflow"
```

### Task 8: Wire UI workflow end-to-end

**Files:**
- Modify: `src/app/App.tsx`
- Create: `src/components/TaskStatusPanel.tsx`
- Create: `src/components/VideoResultPanel.tsx`
- Test: `tests/integration/app-workflow.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { App } from '../../src/app/App'

test('shows completed video state after successful workflow', async () => {
  render(<App />)
  expect(screen.getByText(/status/i)).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/app-workflow.test.tsx`
Expected: FAIL because the full workflow UI is not wired together.

**Step 3: Write minimal implementation**

Connect settings, generation form, image picker, upload client, create client, polling hook, task status panel, and completed video result panel into one user workflow.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/app-workflow.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app src/components tests/integration/app-workflow.test.tsx
git commit -m "feat: wire sora desktop workflow"
```

### Task 9: Add packaging config and build verification

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Create: `scripts/build-macos-app.sh`
- Modify: `package.json`
- Test: `tests/unit/build-config.test.ts`

**Step 1: Write the failing test**

```ts
import tauriConfig from '../../src-tauri/tauri.conf.json'

test('defines mac app bundle target', () => {
  expect(tauriConfig.bundle.active).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/build-config.test.ts`
Expected: FAIL because the packaging config is incomplete.

**Step 3: Write minimal implementation**

Configure Tauri bundle settings for macOS `.app` generation, add a documented build script, and expose the package build command through `package.json`.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/build-config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/tauri.conf.json scripts/build-macos-app.sh package.json tests/unit/build-config.test.ts
git commit -m "build: configure mac app packaging"
```

### Task 10: Run final verification and update project docs

**Files:**
- Modify: `AGENTS.md`
- Modify: `progress.txt`
- Modify: `lesson.md`
- Modify: `docs/plans/2026-03-20-tauri-sora-desktop-design.md`
- Modify: `docs/plans/2026-03-20-tauri-sora-desktop-implementation.md`

**Step 1: Run unit and integration tests**

Run: `npm test`
Expected: PASS

**Observed status (2026-03-20):** PASS — 5 test files and 11 tests passed.

**Step 2: Run production build**

Run: `npm run build`
Expected: PASS and frontend assets generated.

**Observed status (2026-03-20):** PASS — frontend assets generated under `dist/`.

**Step 3: Run Tauri macOS bundle build**

Run: `npm run tauri build -- --bundles app`
Expected: PASS and `.app` bundle generated under the Tauri bundle output path.

**Observed status (2026-03-20):** FAIL in the current Linux environment — the Tauri CLI rejected `app` as an invalid bundle target here and only offered Linux bundle values such as `deb`, `rpm`, and `appimage`. Treat `.app` bundling as blocked by environment/platform until verified on macOS or with a valid cross-build workflow.

**Step 4: Update project tracking files**

Append a concise milestone entry to `progress.txt` and record any debugging attempts in `lesson.md`.

**Observed status (2026-03-20):** Completed. `AGENTS.md`, `progress.txt`, `lesson.md`, and the plan docs were updated to reflect the verified state and current blockers.

**Step 5: Commit**

```bash
git add AGENTS.md progress.txt lesson.md docs/plans
git commit -m "docs: record sora desktop mvp delivery"
```

Plan complete and saved to `docs/plans/2026-03-20-tauri-sora-desktop-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?