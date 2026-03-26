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

2026-03-24 - Browser CORS regression in Generate flow
- Symptom: After upload succeeded and returned a public `img.linxi.icu` URL, generation failed in browser dev with CORS errors and `TypeError: Failed to fetch`, followed by unhandled promise noise in console.
- Suspected cause: The upload endpoint or token was invalid.
- Actual cause: `createLinxiVideo` was re-fetching uploaded URLs in the browser to convert them into `File` objects before calling `/v1/videos`; that second fetch hit an origin that does not allow `http://localhost:5174` CORS, so the request failed before create API submission.
- Fix: Removed second-stage image fetch in `createLinxiVideo`, appended uploaded `http/https` URLs directly as `input_reference`, added URL validation, and wrapped `handleGenerationSubmit` in `try/catch` so API/client errors surface through `submissionError` instead of uncaught promise rejections.
- Takeaway: Once a public asset URL is obtained, avoid browser-side relay fetches unless the remote origin explicitly supports CORS; forward URL references directly to the backend contract when allowed.

2026-03-24 - Generate flow image-bed removal and test harness mismatch
- Symptom: After user required "no image bed", Generate flow still hit `img.linxi.icu` and console showed upload responses before create errors.
- Suspected cause: Residual upload call sites might still exist outside the obvious workflow.
- Actual cause: `App.tsx` still hardcoded upload endpoint/token and always called `uploadImages` before create; also, the first round of `createLinxiVideoWithFiles` unit tests accidentally triggered real network calls because Node-only branch detection (`process.versions.node`) is also true under Vitest/jsdom.
- Fix: Rewired Generate submit path to call `createLinxiVideoWithFiles` directly with local file/path inputs, removed upload-client usage from that flow, and rewrote `linxi-create-client` unit tests to mock Node `form-data` + `fs.createReadStream` branch explicitly instead of relying on browser fetch mocks.
- Takeaway: In hybrid test environments, `process`-based runtime checks can route code into Node branches even with jsdom; isolate tests by mocking the exact transport branch (Node submit vs browser fetch) to avoid unintended real API traffic.

2026-03-24 - Video download CORS failure in browser mode
- Symptom: Clicking `Download Video` failed consistently in local browser dev, with console errors showing CORS blocks and failed fetch for cross-origin `.mp4` URLs.
- Suspected cause: Remote storage URL or task status payload was malformed.
- Actual cause: `video-download.ts` used `fetch(videoUrl)` + `blob()` for both browser and Tauri paths. In browser dev this requires CORS on the video origin, so download failed before any save action.
- Fix: Changed browser mode to direct anchor-link download (no JS fetch), changed Tauri mode to use `@tauri-apps/plugin-http` for binary GET and `@tauri-apps/plugin-fs` write after save dialog selection, and added dedicated `video-download` unit coverage for browser/Tauri success and failure branches.
- Takeaway: For cross-origin media downloads, browser-side `fetch/blob` is fragile unless the media origin explicitly allows CORS; use navigation-style downloads in browser and native HTTP clients in desktop runtime.

2026-03-24 - History replay gap after generation completion
- Symptom: Users could preview/download only the current completed run, but historical jobs in session view could not reliably replay or download again.
- Suspected cause: Missing history page UI.
- Actual cause: Recent jobs only stored task metadata and initial status; there was no persistent record synchronization from polling status/video URL updates, so completed playback targets were not guaranteed to exist for past jobs.
- Fix: Introduced persistent `recent-jobs-store`, expanded `RecentJob` with `updatedAt/videoUrl/error`, synchronized poll results into history in `App.tsx`, and added a dedicated `HistoryWorkspace` tab that lists jobs and reuses `VideoPreview` for repeated play/download.
- Takeaway: Historical media replay needs both UI and durable data plumbing; recording only task id/prompt at submit time is insufficient for post-completion actions.

2026-03-24 - Session-to-history quick navigation usability gap
- Symptom: Even after adding History replay, users still needed manual tab switching and visual lookup to locate the target task.
- Suspected cause: History sorting/select logic might be wrong.
- Actual cause: Generate session list had no direct affordance to open a specific job in History context.
- Fix: Added `Open in History` action per session row (only for playable jobs), wired `App.tsx` to switch tab and pass selected task id into `HistoryWorkspace`, and updated workflow tests to assert direct jump + selected preview.
- Takeaway: Feature completeness includes navigation ergonomics; replay/download flows should preserve task context across pages.

## 2026-03-24 — VideoPreview 错误提示分层

**问题：** 之前所有下载失败都只显示 "Failed to download video"，用户无法判断是 CORS 限制还是网络问题还是 Tauri 文件写入失败。

**方案：** 在 handleDownload 中对错误信息做字符串匹配分类：
- 包含 CORS/fetch/net::ERR → `BROWSER_CORS` → 显示"浏览器安全策略阻止"提示
- 其他未知错误 → `GENERIC` → 显示"检查网络连接"提示
- 用户取消（null 返回）→ 静默返回不弹提示

**教训：** 错误提示要分层次、可操作，让用户知道是什么导致的、怎么解决，而不是只说"出错了"。

**另一个问题：** GenerateWorkspace 混用 Antd (`<Card>`, `<Alert>`) 和裸 Tailwind (`className="flex flex-col gap-6"`)，视觉不统一。整个应用已统一为 Antd 风格。

2026-03-24 - Video preview/download network dependency regression
- Symptom: Users hit "Download failed / Check your network connection" while previewing or saving completed videos, even after job completion.
- Suspected cause: Save action itself was unstable.
- Actual cause: Both preview (`<video src={remoteUrl}>`) and save (`plugin-http` GET on click) depended on the remote URL being reachable at interaction time, so transient network/CORS/storage-origin failures caused repeated user-facing failures.
- Fix: Added `video-cache.ts` to pre-download remote videos into `$TEMP/linxi-video-cache/video-{taskId}.mp4` in Tauri mode, switched `VideoPreview` to use cache-resolved local source when available, and updated `downloadVideo` to copy local cached files directly to user-selected destination.
- Takeaway: For desktop UX, playback and download should not re-depend on remote availability after a result URL is obtained; cache to local temp first, then operate on local files for stability.
