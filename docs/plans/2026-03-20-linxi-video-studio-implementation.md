# Linxi Video Studio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reshape the current Tauri desktop MVP into a Generate-first Linxi Video Studio with visible Generate / Iterate / Storyboard modes, a polished generation workflow, and a model-extensible structure.

**Architecture:** Keep the app as a Tauri 2 + React + TypeScript desktop shell, but refactor the single engineering-driven page into a product-oriented workspace. Build one fully working Generate mode on top of the existing upload/create/query pipeline, and add non-deceptive placeholder shells for Iterate and Storyboard until backend semantics are confirmed.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Vitest, Testing Library, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`

---

### Task 0: Stabilize ImagePicker runtime behavior

**Files:**
- Modify: `src/features/uploads/ImagePicker.tsx`
- Modify: `tests/unit/image-picker.test.tsx`

**Step 1: Write the failing fallback test**

Add a failing test proving `ImagePicker` does not call the Tauri dialog in plain browser mode and instead uses a hidden file input fallback.

```tsx
test('falls back to browser file selection when not running in Tauri', async () => {
  vi.mocked(isTauri).mockReturnValue(false);
  render(<TestWrapper />);

  fireEvent.click(screen.getByRole('button', { name: /choose images/i }));

  expect(open).not.toHaveBeenCalled();
  expect(screen.getByTestId('browser-image-input')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/image-picker.test.tsx`
Expected: FAIL because no browser fallback or runtime guard exists yet.

**Step 3: Write minimal implementation**

Update `ImagePicker.tsx` so it:
- imports `isTauri` from `@tauri-apps/api/core`
- uses Tauri dialog path only when `isTauri()` is true
- otherwise triggers a hidden `<input type="file" multiple accept="image/*">`
- creates preview URLs with `URL.createObjectURL(file)` in browser fallback mode
- preserves current Tauri path behavior with `convertFileSrc(path)`
- keeps remove-image behavior unchanged

**Step 4: Expand tests for both paths**

Add tests covering:
- Tauri path still works
- browser fallback path emits selected previews
- remove image still works after fallback selection

**Step 5: Run verification**

Run: `npm run test -- tests/unit/image-picker.test.tsx`
Expected: PASS

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```bash
git add src/features/uploads/ImagePicker.tsx tests/unit/image-picker.test.tsx
git commit -m "fix: add browser fallback for image picker runtime"
```

---

### Task 1: Introduce top-level workspace navigation

**Files:**
- Create: `src/app/workspace-types.ts`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/app-shell.test.tsx`

**Step 1: Write the failing test**

Add assertions that the app shell shows top-level modes:
- Generate
- Iterate
- Storyboard

```tsx
test('renders workspace navigation for product modes', () => {
  render(<App />);

  expect(screen.getByRole('tab', { name: /generate/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /iterate/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /storyboard/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/app-shell.test.tsx`
Expected: FAIL because the current shell only renders the single-page layout.

**Step 3: Write minimal implementation**

Create `workspace-types.ts` with a typed mode union:

```ts
export type WorkspaceMode = 'generate' | 'iterate' | 'storyboard';
```

Update `App.tsx` to:
- hold `activeMode: WorkspaceMode`
- render accessible mode tabs
- keep Generate active by default
- preserve the existing Generate area until later tasks split it out

**Step 4: Run targeted verification**

Run: `npm run test -- tests/unit/app-shell.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/workspace-types.ts src/app/App.tsx tests/unit/app-shell.test.tsx
git commit -m "feat: add top-level workspace navigation"
```

---

### Task 2: Extract Generate mode into a dedicated workspace component

**Files:**
- Create: `src/features/workspace/GenerateWorkspace.tsx`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/app-workflow.test.tsx`

**Step 1: Write the failing test**

Add a test that the Generate workflow renders inside a dedicated workspace while preserving the upload → create → poll behavior.

```tsx
test('renders the generation workflow inside the generate workspace', () => {
  render(<App />);
  expect(screen.getByText(/generate video/i)).toBeInTheDocument();
  expect(screen.getByText(/settings/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/app-workflow.test.tsx`
Expected: FAIL if the test explicitly targets the new workspace boundary.

**Step 3: Write minimal implementation**

Create `GenerateWorkspace.tsx` that accepts the current Generate dependencies as props, including:
- `selectedImages`
- `onImagesSelected`
- `onSubmit`
- `submissionError`
- `currentTaskId`
- `generationJob`

Move the current Generate layout out of `App.tsx` into this component without changing product behavior.

**Step 4: Run targeted verification**

Run: `npm run test -- tests/unit/app-workflow.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/workspace/GenerateWorkspace.tsx src/app/App.tsx tests/unit/app-workflow.test.tsx
git commit -m "refactor: extract generate workspace"
```

---

### Task 3: Add model capability definitions

**Files:**
- Create: `src/features/models/model-capabilities.ts`
- Create: `src/features/models/model-types.ts`
- Test: `tests/unit/build-config.test.ts`

**Step 1: Write the failing test**

Add or create a focused test file that proves model capability metadata exists for:
- `sora-2`
- `sora-2-pro`
- placeholder future `veo`
- placeholder future `seedance`

```ts
test('defines visible model capability entries for current and future models', () => {
  expect(modelCatalog['sora-2']).toBeDefined();
  expect(modelCatalog['sora-2-pro']).toBeDefined();
  expect(modelCatalog['veo']).toBeDefined();
  expect(modelCatalog['seedance']).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/build-config.test.ts`
Expected: FAIL if temporarily extended there, or create a new focused test file and run that instead.

**Step 3: Write minimal implementation**

Create typed model definitions such as:

```ts
export interface ModelCapability {
  id: string;
  label: string;
  available: boolean;
  supportedDurations: number[];
  supportedSizes: Array<'small' | 'large'>;
  supportsPrivate: boolean;
  supportsWatermark: boolean;
}
```

Seed the catalog with:
- `sora-2`
- `sora-2-pro`
- future placeholders `veo`, `seedance`

**Step 4: Run targeted verification**

Run: `npm run test -- tests/unit/build-config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/models/model-capabilities.ts src/features/models/model-types.ts tests/unit/build-config.test.ts
git commit -m "feat: add model capability catalog"
```

---

### Task 4: Align generation parameter schema with confirmed Linxi model values

**Files:**
- Modify: `src/features/video-generation/generation-schema.ts`
- Modify: `src/features/video-generation/GenerationForm.tsx`
- Test: `tests/unit/generation-form.test.tsx`

**Step 1: Write the failing test**

Add tests that the form reflects the documented Linxi-compatible values:
- orientation: `portrait`, `landscape`
- size: `small`, `large`
- duration values compatible with Sora models
- private toggle visible in the Generate UI path

```tsx
test('submits Linxi-compatible generation parameters', async () => {
  render(<GenerationForm onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText(/size/i), { target: { value: 'small' } });
  fireEvent.change(screen.getByLabelText(/duration/i), { target: { value: '10' } });
  fireEvent.click(screen.getByLabelText(/private/i));

  // submit + assert payload
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/generation-form.test.tsx`
Expected: FAIL because the current schema still uses the earlier placeholder value set.

**Step 3: Write minimal implementation**

Update the generation schema and form to match the API research:
- duration as numeric values for current Sora models (`10`, `15`, `25` where relevant)
- size values aligned to `small` / `large`
- orientation values aligned to documented contract
- add a `private` boolean if missing
- preserve strong typing throughout

**Step 4: Run targeted verification**

Run: `npm run test -- tests/unit/generation-form.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/video-generation/generation-schema.ts src/features/video-generation/GenerationForm.tsx tests/unit/generation-form.test.tsx
git commit -m "feat: align generation parameters with Linxi models"
```

---

### Task 5: Add Generate page product sections and clearer status panel

**Files:**
- Modify: `src/features/workspace/GenerateWorkspace.tsx`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/app-workflow.test.tsx`

**Step 1: Write the failing test**

Add tests for the productized Generate page structure:
- prompt section
- reference images section
- model/settings section
- current task/result panel

```tsx
test('renders the generate workspace sections', () => {
  render(<App />);

  expect(screen.getByText(/reference images/i)).toBeInTheDocument();
  expect(screen.getByText(/model and settings/i)).toBeInTheDocument();
  expect(screen.getByText(/current task/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/app-workflow.test.tsx`
Expected: FAIL until section structure is made explicit.

**Step 3: Write minimal implementation**

Update `GenerateWorkspace.tsx` to render explicit product sections with headings and consistent layout. Keep logic unchanged; improve structure and affordance only.

**Step 4: Run targeted verification**

Run: `npm run test -- tests/unit/app-workflow.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/workspace/GenerateWorkspace.tsx src/app/App.tsx tests/unit/app-workflow.test.tsx
git commit -m "feat: productize generate workspace layout"
```

---

### Task 6: Improve reactive settings usage in app orchestration

**Files:**
- Modify: `src/features/config/SettingsForm.tsx`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/settings-form.test.tsx`

**Step 1: Write the failing test**

Add a test proving that after saving settings, the active Generate workflow uses the updated values without requiring a full restart.

```tsx
test('uses updated settings after save', async () => {
  render(<App />);
  // update settings mock/UI
  // trigger generate flow
  // assert latest settings were used
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/settings-form.test.tsx`
Expected: FAIL because `App.tsx` currently memo-loads settings once.

**Step 3: Write minimal implementation**

Refactor settings flow so `App.tsx` can respond to settings changes. Prefer an explicit callback or shared state lift rather than reloading through opaque global behavior.

**Step 4: Run targeted verification**

Run: `npm run test -- tests/unit/settings-form.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/config/SettingsForm.tsx src/app/App.tsx tests/unit/settings-form.test.tsx
git commit -m "fix: make app use updated settings reactively"
```

---

### Task 7: Add Iterate placeholder mode

**Files:**
- Create: `src/features/workspace/IterateWorkspace.tsx`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/app-shell.test.tsx`

**Step 1: Write the failing test**

Add a test that selecting the Iterate tab shows a beta/coming-soon shell rather than the Generate page.

```tsx
test('shows iterate placeholder workspace', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('tab', { name: /iterate/i }));

  expect(screen.getByText(/iterative refinement/i)).toBeInTheDocument();
  expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/app-shell.test.tsx`
Expected: FAIL because no Iterate workspace exists yet.

**Step 3: Write minimal implementation**

Create `IterateWorkspace.tsx` with:
- base video area placeholder
- conversation/timeline placeholder
- edit composer placeholder
- clear explanation that native edit/remix API support is pending

Wire it into tab selection in `App.tsx`.

**Step 4: Run targeted verification**

Run: `npm run test -- tests/unit/app-shell.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/workspace/IterateWorkspace.tsx src/app/App.tsx tests/unit/app-shell.test.tsx
git commit -m "feat: add iterate mode placeholder workspace"
```

---

### Task 8: Add Storyboard placeholder mode

**Files:**
- Create: `src/features/workspace/StoryboardWorkspace.tsx`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/app-shell.test.tsx`

**Step 1: Write the failing test**

Add a test that selecting the Storyboard tab shows a storyboard shell and roadmap messaging.

```tsx
test('shows storyboard placeholder workspace', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('tab', { name: /storyboard/i }));

  expect(screen.getByText(/shot list/i)).toBeInTheDocument();
  expect(screen.getByText(/planned/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/app-shell.test.tsx`
Expected: FAIL because no Storyboard workspace exists yet.

**Step 3: Write minimal implementation**

Create `StoryboardWorkspace.tsx` with:
- shot list placeholder
- selected shot editor placeholder
- global style/model sidebar placeholder
- clear note that true storyboard semantics await confirmed backend support

Wire it into `App.tsx`.

**Step 4: Run targeted verification**

Run: `npm run test -- tests/unit/app-shell.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/workspace/StoryboardWorkspace.tsx src/app/App.tsx tests/unit/app-shell.test.tsx
git commit -m "feat: add storyboard mode placeholder workspace"
```

---

### Task 9: Add recent jobs/history surface for Generate mode

**Files:**
- Create: `src/features/workspace/recent-job-types.ts`
- Modify: `src/features/workspace/GenerateWorkspace.tsx`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/app-workflow.test.tsx`

**Step 1: Write the failing test**

Add a test proving completed or in-flight jobs appear in a recent jobs area.

```tsx
test('shows recent jobs after generation starts', async () => {
  render(<App />);
  // trigger generation
  expect(await screen.findByText(/recent jobs/i)).toBeInTheDocument();
  expect(screen.getByText(/task-123/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/app-workflow.test.tsx`
Expected: FAIL because only one current task card exists today.

**Step 3: Write minimal implementation**

Add lightweight local recent-job state in `App.tsx`:
- append task metadata when a generation starts
- show a small recent jobs list in `GenerateWorkspace`
- keep scope small: no persistence, no queue engine, no concurrency management

**Step 4: Run targeted verification**

Run: `npm run test -- tests/unit/app-workflow.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/workspace/recent-job-types.ts src/features/workspace/GenerateWorkspace.tsx src/app/App.tsx tests/unit/app-workflow.test.tsx
git commit -m "feat: add recent jobs surface to generate workflow"
```

---

### Task 10: Update docs and verification artifacts for the redesigned product

**Files:**
- Modify: `AGENTS.md`
- Modify: `progress.txt`
- Modify: `lesson.md`
- Modify: `docs/plans/2026-03-20-linxi-video-studio-design.md`
- Modify: `docs/plans/2026-03-20-linxi-video-studio-implementation.md`

**Step 1: Write the failing check**

Create a checklist from the approved design and this plan. Verify that docs mention:
- Generate-first recommendation
- Iterate placeholder mode
- Storyboard placeholder mode
- model extensibility
- runtime fallback note for browser vs Tauri image picking

**Step 2: Run project verification before doc updates**

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: PASS

**Step 3: Update documentation and tracking files**

Append or revise:
- `progress.txt` with what changed and current state
- `lesson.md` with the runtime image-picker diagnosis and fix
- `AGENTS.md` if command or architecture guidance needs refresh
- plan/design docs if implementation reality adds important constraints

**Step 4: Run final verification**

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: PASS

Run: `npm run tauri -- --help`
Expected: PASS

**Step 5: Commit**

```bash
git add AGENTS.md progress.txt lesson.md docs/plans/2026-03-20-linxi-video-studio-design.md docs/plans/2026-03-20-linxi-video-studio-implementation.md
git commit -m "docs: align plans and tracking with Linxi Video Studio redesign"
```

---

## Execution Notes
- Treat **Task 0** as mandatory before any UI restructuring so browser dev no longer crashes on image selection.
- Keep Generate mode fully working at every checkpoint; do not break the upload → create → query → preview path while introducing new navigation or placeholders.
- Do not fake unsupported backend behavior. Iterate and Storyboard are intentionally scoped as placeholders until API support is clarified.
- Keep model extensibility data-driven. Do not fork the UI for each provider.
- Preserve TDD discipline: every new behavior or bugfix must be proved by a failing test first.

## Final Verification Target
At the end of this plan, the repository should provide:
- a stable image picker in both Tauri and plain browser dev contexts
- a Generate-first productized workspace
- visible Iterate and Storyboard placeholder modes
- a model-capability foundation for `sora-2`, `sora-2-pro`, future `veo`, and future `seedance`
- green tests and build output
- updated project docs reflecting the new product direction

---

## Execution Status Note
As of the current repository state, Tasks 0 through 9 from this implementation plan have been completed and verified locally.

Fresh verified commands already observed in this environment:
- `npm test` → passing
- `npm run build` → passing
- `npm run tauri -- --help` → passing

What remains outside this completed redesign scope is backend confirmation for true Iterate and Storyboard generation semantics. The shipped `Iterate` and `Storyboard` modes are intentionally honest placeholders rather than fake unsupported flows.
