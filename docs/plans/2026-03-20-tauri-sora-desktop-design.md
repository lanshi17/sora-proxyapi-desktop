# Tauri Sora Desktop MVP Design

## Goal
Build a macOS desktop MVP that lets a user enter a linxi.chat API key and model, select local images, upload those images through an existing upload API that returns public URLs, submit a video generation request to linxi.chat, poll task status, preview the completed video, and download the result as a `.app` suitable for small-scale internal testing.

## Constraints and Confirmed Decisions
- The repository now has a checked-in Tauri 2 + React + TypeScript scaffold with Vitest-based tests and packaging config.
- The linxi.chat `POST /v1/video/create` API uses `images: string[]`, so it expects URLs rather than direct binary file upload.
- The user confirmed that local image selection is mandatory.
- The user confirmed an existing upload API is available and should be used to convert local files into URLs.
- The png.cm upload contract was later confirmed and implemented (`POST https://png.cm/api/index.php`, multipart field `image`, body field `token`, response JSON path `url`).
- The target distribution is a macOS `.app` for a small internal test group, not App Store release.
- The MVP should prioritize speed, low packaging friction, and a clean path to preview/download generated videos.
- Current verified environment status: `npm test` and `npm run build` pass locally; macOS `.app` bundling has not been verified from this Linux environment.

## Recommended Architecture
Use **Tauri 2 + React + TypeScript**.

### Why this approach
- Smaller app size and lower memory overhead than Electron.
- Faster to build UI-heavy workflows like forms, uploads, polling states, and media previews.
- Good fit for a single-window internal-tool MVP.
- Can package to a macOS `.app` without the overhead of a fully native SwiftUI implementation.
- Keeps the product open to future desktop expansion without committing to a heavy browser runtime.

## Rejected Alternatives
### Electron + React
- Viable, but unnecessarily heavy for this workflow.
- Larger bundle size and higher resource use.
- Lower leverage than Tauri for a simple internal MVP.

### Native SwiftUI
- Strong native macOS experience, but slower to iterate.
- Harder to reuse for future non-mac platforms.
- Overkill for a form/upload/polling/media-preview application.

## MVP Scope
### Included
- API key input and local persistence.
- Model input or selectable model field.
- Prompt input.
- Local image selection from disk.
- Upload selected images via the existing upload API.
- Submit video generation jobs to linxi.chat.
- Poll `GET /v1/video/query?id=...` until completion or failure.
- Show task ID and current generation status.
- Preview generated video and thumbnail when available.
- Download the completed video.
- Export a local `.app` build for internal testers.

### Excluded from MVP
- User accounts or multi-user sync.
- Multi-task queue management.
- History library across launches beyond minimal local state.
- Auto-update.
- App Store release.
- Advanced editing or remix workflows.
- Character-based video flow unless the upload API and business rules are later confirmed.

## High-Level User Flow
1. User opens the app.
2. User enters API key and model.
3. User enters prompt and generation settings.
4. User selects one or more local image files.
5. App uploads each selected file to the existing upload API.
6. App receives one or more public image URLs.
7. App sends those URLs to `POST /v1/video/create`.
8. App stores the returned task ID.
9. App polls `GET /v1/video/query?id=...` until status becomes completed or failed.
10. App shows preview assets and enables video download.

## Proposed Project Structure
```text
./
├── AGENTS.md
├── package.json
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── config/
│   │   ├── uploads/
│   │   └── video-generation/
│   ├── lib/
│   ├── types/
│   └── main.tsx
├── src-tauri/
│   ├── tauri.conf.json
│   └── capabilities/
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   └── plans/
├── scripts/
├── logs/
└── .gitignore
```

## UI Design
Use a single-window layout with four sections:

### 1. Settings Panel
- API key input.
- Model field.
- Optional upload API base URL if needed separately from linxi.chat.
- Save settings locally.

### 2. Generation Form
- Prompt textarea.
- Orientation selector.
- Size selector.
- Duration selector.
- Watermark toggle.

### 3. Image Input Panel
- Local file picker.
- Selected image previews.
- Per-image upload state.
- Remove image action.

### 4. Task Result Panel
- Task ID.
- Current status.
- Error message if failed.
- Thumbnail preview if available.
- Video player when `video_url` is ready.
- Download action.

## State Model
Keep state intentionally small:
- `settings`: API key, model, optional upload endpoint config.
- `selectedImages`: local file metadata and preview URLs.
- `uploadedImages`: remote URLs returned by upload API.
- `jobDraft`: prompt, orientation, size, duration, watermark.
- `jobState`: idle, uploading, creating, polling, completed, failed.
- `jobResult`: task ID, status, timestamps, thumbnail URL, video URL, error details.

Use React state plus a small store such as Zustand only if component state becomes awkward.

## API Integration Design
### Upload API contract
Assume the upload API takes a local file and returns a public URL. The desktop app needs a dedicated upload client that:
- sends multipart file data,
- validates success,
- extracts the returned URL,
- normalizes failures into a single UI-safe error shape.

### linxi.chat create request
Send JSON to `POST https://linxi.chat/v1/video/create` with:
- `images`: uploaded public URLs,
- `model`,
- `orientation`,
- `prompt`,
- `size`,
- `duration`,
- `watermark`,
- optionally `private` only if later confirmed necessary.

### linxi.chat query request
Poll `GET https://linxi.chat/v1/video/query?id=<task-id>`.
Stop polling when:
- status is `completed`,
- status is `failed`,
- retry/time budget is exceeded.

## Error Handling
The MVP must explicitly handle:
- missing API key,
- missing model,
- no images selected,
- upload failure for one or more images,
- create request rejection,
- polling timeout,
- completed response without usable `video_url`,
- invalid server payloads.

All network errors should be surfaced in user-readable language with a technical detail string available for debugging.

## Persistence
Persist only lightweight local settings:
- API key,
- last-used model,
- last-used generation options,
- last-known upload API endpoint if configurable.

Do not build a full history database in the MVP.

## Security
- Store secrets locally only as needed for MVP.
- Never log raw API keys.
- Redact sensitive headers from debug output.
- Do not send local file paths to linxi.chat.
- Only send upload-generated public URLs to the create endpoint.

## Packaging and Distribution
- Build a macOS `.app` using Tauri build tooling.
- Optimize for internal distribution first.
- Delay auto-update and notarization workflow until after MVP validation unless testers specifically require it.
- If unsigned builds trigger Gatekeeper friction, document the manual open flow for internal testers as a temporary measure.

## Testing Strategy
### Unit tests
- Form validation.
- Upload response normalization.
- Create request payload building.
- Query response parsing.
- Polling state transitions.

### Integration tests
- Mock upload API success/failure.
- Mock linxi.chat create success/failure.
- Mock query polling progression from pending to completed.
- Ensure completed jobs expose preview/download UI state.

### Manual verification
- Select local images.
- Confirm upload produces URLs.
- Submit generation request.
- Confirm polling updates UI.
- Confirm completed video previews and downloads.
- Confirm `.app` launches on a second internal Mac if available.

## Delivery Milestones
1. Scaffold Tauri + React + TypeScript project structure.
2. Build settings and generation form UI.
3. Add local image selection and preview.
4. Integrate upload API.
5. Integrate linxi.chat create API.
6. Integrate query polling.
7. Add result preview and download.
8. Add tests.
9. Package `.app` for internal testing.

## Acceptance Criteria
- User can launch the app on macOS.
- User can choose local images and see previews.
- Selected images are uploaded successfully and converted to URLs.
- User can submit a video generation job with prompt and settings.
- App polls task status and shows progress.
- Completed jobs expose playable and downloadable video output.
- Failed jobs show clear errors.
- A `.app` bundle can be produced for internal testers.