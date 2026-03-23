2026-03-20 - Task 1 scaffold review
- Symptom: Oracle flagged the initial scaffold as not fully coherent.
- Suspected cause: The subagent created a minimal shell but JS and Rust Tauri versions were misaligned and CSS was imported twice.
- Actual cause: `package.json` used `@tauri-apps/api` / `@tauri-apps/cli` `^2.10.1` while `src-tauri/Cargo.toml` used `2.0.0-rc`, and both `src/main.tsx` and `src/app/App.tsx` imported the stylesheet.
- Fix: Removed the duplicate CSS import and updated Rust crates to stable `tauri = 2.5.6` / `tauri-build = 2.5.6`, then verified with `cargo metadata --format-version 1`.
- Takeaway: Treat Oracle findings as concrete follow-up work and verify Tauri JS/Rust version compatibility early.

2026-03-20 - Task 3 typed payload correction
- Symptom: Oracle rejected the generation form despite passing tests.
- Suspected cause: The form behavior worked, but state updates were too loosely typed.
- Actual cause: `GenerationForm.tsx` used a generic string-key change handler, which weakened the promised typed submission payload.
- Fix: Replaced the generic handler with `updateField<K extends keyof GenerationParams>` and field-specific updates, then reran diagnostics and tests before re-review.
- Takeaway: Passing UI tests are not enough when the plan explicitly requires strong typing at the payload boundary.

2026-03-20 - Task 4 picker implementation mismatch
- Symptom: Oracle rejected the first image picker implementation even though tests passed.
- Suspected cause: The implementation behaved correctly in the browser test harness but did not match the approved Tauri-based design.
- Actual cause: The picker used a browser `<input type="file">`, a styled `<label>` trigger, and `URL.createObjectURL`, which violated the Tauri-backed requirement.
- Fix: Researched current Tauri 2 file-picker APIs, added `@tauri-apps/plugin-dialog` plus Rust plugin initialization, switched to a real button trigger, used `open()` and `convertFileSrc()`, rewrote the test to mock Tauri modules, and re-verified with Oracle.
- Takeaway: Plan compliance can fail even when local tests pass; when a task says "Tauri-backed," browser-only shortcuts are the wrong abstraction.

2026-03-20 - Packaging/build configuration root cause
- Symptom: Packaging tests initially had Node type errors, and `npm run build` failed with TypeScript project-reference/config errors.
- Suspected cause: The new packaging test needed Node ambient types, and Vite/Vitest config files were being type-checked through an invalid TS project setup.
- Actual cause: `tests/unit/build-config.test.ts` needed `@types/node`; `vite.config.ts` imported `defineConfig` from `vite` even though it had a `test` block; `tsconfig.json` incorrectly included `vite.config.ts` and referenced `tsconfig.node.json`, whose settings were incompatible for that reference path.
- Fix: Installed `@types/node`, added `"types": ["node"]` to `tsconfig.json`, changed `vite.config.ts` to import `defineConfig` from `vitest/config`, and removed `vite.config.ts` plus the broken reference from `tsconfig.json`.
- Takeaway: Build failures around Vite/Vitest often come from config typing and project-reference mistakes, not the feature code you just added.

2026-03-20 - Final packaging verification on Linux
- Symptom: The planned final bundle command failed during verification.
- Suspected cause: The implementation plan assumed a macOS-capable bundle target would be available in the current environment.
- Actual cause: In this Linux environment, `npm run tauri build -- --bundles app` failed because `app` is not a valid bundle value here; the CLI only offered Linux bundle targets such as `deb`, `rpm`, and `appimage`.
- Fix: Recorded the exact failure, kept the packaging helper/config in place, and marked macOS `.app` output as environment-dependent rather than claiming success.
- Takeaway: Packaging claims must be platform-specific and backed by fresh command output from a compatible environment.

2026-03-20 - Upload client bytes bug
- Symptom: The upload client passed local tests but still uploaded empty files.
- Suspected cause: The form-data shape looked right, so the problem initially appeared to be covered by tests.
- Actual cause: `upload-client.ts` created `new File([], image.name)` and never read the selected local path bytes.
- Fix: Added `@tauri-apps/plugin-fs`, initialized `tauri_plugin_fs::init()`, used `readFile(image.path)` to create real `File` objects with inferred MIME types, and strengthened upload tests to assert byte loading and file size.
- Takeaway: A green multipart test is meaningless if it never proves real bytes were loaded from disk.

2026-03-20 - Browser dev image-picker runtime failure
- Symptom: Clicking `Choose Images` in plain browser dev threw `TypeError: Cannot read properties of undefined (reading 'invoke')` from `@tauri-apps/plugin-dialog`.
- Suspected cause: Dialog plugin wiring looked correct on the Rust side, so the failure initially resembled a plugin-init mismatch.
- Actual cause: The app was sometimes running in plain Vite/browser mode where the Tauri `invoke` bridge is unavailable, and `ImagePicker.tsx` called `open()` unconditionally with no runtime guard.
- Fix: Added an `isTauri()` guard, hidden browser file-input fallback, browser preview creation with `URL.createObjectURL(file)`, and tests covering both Tauri and non-Tauri paths.
- Takeaway: Any Tauri plugin call in shared React code needs an explicit non-Tauri fallback if browser dev remains supported.

2026-03-20 - Reactive settings orchestration gap
- Symptom: Saving new API/model/upload settings did not affect the next generation until the app was restarted.
- Suspected cause: Settings were persisted correctly, so the bug initially looked like a test harness issue.
- Actual cause: `App.tsx` snapshotted settings once with `useMemo(() => settingsStore.load(), [])`, and `SettingsForm.tsx` saved to localStorage without notifying the parent.
- Fix: Lifted settings into reactive state in `App.tsx`, added `handleSettingsSaved`, passed it through `GenerateWorkspace`, and made `SettingsForm` call `onSettingsSaved?.(settings)` after save.
- Takeaway: Persistence alone is not reactivity; orchestration code must subscribe to the saved values it depends on.

2026-03-20 - Recent jobs proof gap
- Symptom: Oracle rejected Task 9 even though the Recent Jobs feature was visible and local tests were green.
- Suspected cause: The feature itself might have been incomplete.
- Actual cause: `tests/unit/app-workflow.test.tsx` only proved `task-123` existed somewhere on the page, but that same id appeared in both `Current Task & Result` and `Recent Jobs`, so the test did not prove the new surface specifically.
- Fix: Added `data-testid="recent-jobs"` to the Recent Jobs section and updated the workflow test to use `within(recentJobsSection)` and assert the task id and prompt inside that section.
- Takeaway: When new UI duplicates existing text, tests must scope assertions to the intended region instead of relying on global text matches.
