# Linxi Video Studio Design Proposal

## Document Type
Product design proposal for the first public macOS desktop release.

## Goal
Build a simple, downloadable macOS app that lets users generate AI videos through Linxi-backed models with the smoothest possible first-run experience, while keeping the product structure extensible for future creation modes and future models.

## Recommended Product Direction
**Generate-first, mode-extensible creative workstation**.

The first release should make one workflow excellent:
- **Prompt + image(s) → video**

At the same time, the product structure should visibly reserve room for:
- **Generate**
- **Iterate**
- **Storyboard**

This gives the app a clear long-term shape without forcing the first release to fake capabilities the current API surface does not clearly support.

---

## 1. Product Positioning
This product should not be designed as a social feed, template marketplace, or complex filmmaking suite.

It should be positioned as:
- a **personal creative workstation**
- a **desktop-first generation tool**
- a **model-switchable video creation app**
- a **fast path from idea to playable result**

The product promise for v1 is simple:
> Enter a prompt, optionally provide reference images, choose a model, generate a video, and immediately review the result.

---

## 2. Why This Direction
### 2.1 API reality
Confirmed Linxi-facing Sora capabilities currently support:
- `POST /v1/video/create`
- `GET /v1/video/query?id=...`
- bearer-token auth
- model-driven creation with fields like `images`, `prompt`, `orientation`, `size`, `duration`, `watermark`, and `private`

Confirmed constraints:
- `images` must be **public URLs**, not local file paths
- `sora-2` and `sora-2-pro` are valid first-release models
- query polling is the reliable completion path

Unconfirmed or weakly documented capabilities:
- true chat-style edit/remix endpoint
- first-class storyboard generation semantics
- multi-shot orchestration behavior per image
- strong edit-history/versioning primitives

### 2.2 Product fit
Because the create/query flow is clear while iterative edit and storyboard semantics are not, the strongest first release is a **Generate-first** product.

### 2.3 Technical fit
The current application already approximates a rough Generate workflow:
- local image selection
- upload to public URL
- create request
- query polling
- result preview

So the best design path is to **productize and simplify what is already structurally viable**, rather than pivot into a speculative chat-first or storyboard-first product too early.

---

## 3. Product Principles
### 3.1 One great first workflow
If the first release can only make one experience truly strong, it should be:
- **Prompt + image(s) → video**

### 3.2 Visible extensibility
The UI should clearly suggest that more creation modes are coming, but the product should not pretend unsupported capabilities already exist.

### 3.3 Model abstraction, not model hardcoding
The interface should not be designed as a Sora-only shell. It should support:
- `sora-2`
- `sora-2-pro`
- future `veo`
- future `seedance`

This means model differences should be represented through capability mapping and parameter availability, not separate one-off pages per provider.

### 3.4 Desktop-first interaction
Because this is a macOS app, the experience should emphasize:
- easy local file selection
- stable status visibility
- persistent settings
- clear task/result continuity
- minimal cognitive load

---

## 4. Information Architecture
## Top-level navigation
The recommended top-level structure is a simple three-mode workspace:
- **Generate**
- **Iterate**
- **Storyboard**

### v1 readiness by mode
- **Generate** — fully implemented and production-focused
- **Iterate** — structured placeholder or beta shell
- **Storyboard** — structured placeholder or concept shell

This gives users a clear roadmap without overcommitting unsupported product behavior.

---

## 5. Generate Mode (v1 Core)
Generate is the hero mode for the first release.

## 5.1 User job
The user wants to:
1. describe a video
2. optionally attach one or more reference images
3. choose model + parameters
4. generate
5. watch status
6. preview/download the final output

## 5.2 Layout recommendation
Use a **two-column workstation layout**.

### Left column: creation controls
Organize into four sections.

#### A. Prompt section
- multi-line prompt input
- helpful placeholder examples
- optional future “enhance prompt” affordance, but not required for v1

#### B. Reference images section
- local image picker
- selected image thumbnails
- remove image action
- optional upload-state indicators later

#### C. Model and parameters section
- model selector
  - `sora-2`
  - `sora-2-pro`
  - future `veo`
  - future `seedance`
- orientation selector
- size selector
- duration selector
- watermark toggle
- private toggle

#### D. Actions section
- primary action: **Generate Video**
- secondary action: **Reset**

### Right column: task and result panel
This should contain:
- current task card
- current status text
- error display
- completed video preview
- download/open actions
- optional recent results list

This keeps the full flow on a single screen and is better suited to desktop use than a chat-feed layout for v1.

## 5.3 Required v1 interactions
Generate mode must support:
- prevent submission when no image is selected if image-based flow is required
- upload local files before calling Linxi create
- map uploaded public URLs into the create request
- show task id and status during polling
- show a clear failure state on upload/create/query problems
- show the generated video as soon as polling reaches completion
- allow downloading/opening the final asset

---

## 6. Iterate Mode (v1 Reserved Structure)
Iterate mode should be designed as the future home for chat-style video refinement, inspired by sora.chatgpt.com, but not forced into the first release unless the backend capability is confirmed.

## 6.1 Intended future user job
The user wants to:
- start from an existing generated video
- describe how it should change
- preserve creative context across versions
- iterate conversationally

## 6.2 Recommended future layout
- top: selected base video / current version
- middle: conversation timeline of edits
- bottom: “Describe the next change” composer
- side panel: model/version/settings/history

## 6.3 v1 recommendation
Do **not** ship this as a fake full feature.
Instead, choose one of:
- a **Coming Soon** mode with page shell and clear explanation
- a **Beta placeholder** that says iterative edit will unlock when edit/remix APIs are clarified

Why:
- current API research does not confirm a native chat-edit pipeline
- forcing a fake chat layer in v1 would create false product promises and brittle implementation

---

## 7. Storyboard Mode (v1 Reserved Structure)
Storyboard mode should be the future home for multi-shot planning and structured scene composition.

## 7.1 Intended future user job
The user wants to:
- break an idea into shots
- define shot prompts, reference frames, and order
- generate a more directed sequence

## 7.2 Recommended future layout
- left: shot list / reorderable storyboard items
- center: selected shot editor
- right: global style + model settings
- bottom: generate storyboard sequence

## 7.3 v1 recommendation
Treat this as a **future mode**, not a fully working first-release feature.

Reason:
- multi-image support exists at the create payload level
- but the docs do not clearly define whether multi-image input equals real storyboard semantics
- there is no confirmed per-shot prompt/timing API surface yet

So for v1 this mode should be framed as a roadmap direction, not as a fully promised capability.

---

## 8. Model Extensibility Strategy
The app should be built around a **model capability layer**.

Each model should eventually define:
- provider
- display label
- supported durations
- supported sizes
- supported orientation options
- watermark support
- privacy support
- image-conditioning support
- iterative-edit support
- storyboard support

This allows the UI to:
- keep one shared structure
- show/hide unsupported options per model
- scale cleanly as `sora`, `veo`, and `seedance` families expand

For v1, the product should visibly default to:
- `sora-2`
- `sora-2-pro`

with future slots reserved for:
- `veo`
- `seedance`

---

## 9. Recommended v1 User Experience
## First-run experience
On first launch, the user should understand three things immediately:
1. where to enter API settings
2. how to attach images and prompt
3. where results will appear

## Suggested first-run flow
1. User opens app
2. User enters Linxi API key and upload endpoint settings
3. User lands in **Generate** by default
4. User picks local image(s)
5. User writes prompt
6. User selects model/parameters
7. User clicks Generate
8. App uploads files to public URLs
9. App creates Linxi task
10. App polls task status
11. App previews video when complete
12. User downloads or opens result

This must feel like one continuous flow, not a collection of disconnected forms.

---

## 10. What v1 Should Not Try to Do
To keep the release simple and trustworthy, avoid these in the first public version:
- social feed behavior
- fake conversational editing without confirmed backend support
- fake storyboard assembly pretending to be real multi-shot generation
- complex multi-task queue management
- template marketplaces
- team collaboration features
- heavy cinematic timeline editing

These are good future directions, but bad first-release distractions.

---

## 11. Recommended Product Decision
### Final recommendation
Ship a **Generate-first macOS creative workstation** with visible but non-primary future modes for **Iterate** and **Storyboard**.

### Why this is the right choice
It is the best balance of:
- API reality
- implementation certainty
- user clarity
- future extensibility
- desktop usability

### Product summary in one sentence
> A simple macOS app for turning prompts and reference images into AI videos through Linxi-backed models, with a clean Generate-first workflow and a structure ready for future iterative and storyboard-based creation.

---

## 12. Proposed next step
If this direction looks right, the next step should be:
- write a concrete implementation plan for this product direction
- split work into:
  1. IA/UI restructuring
  2. Generate workflow polish
  3. Iterate placeholder mode
  4. Storyboard placeholder mode
  5. model-capability abstraction

That plan should then guide the next implementation phase.

---

## 13. Execution Status Note
As of the current repository state, the approved Generate-first redesign has been implemented through:
- top-level `Generate`, `Iterate`, and `Storyboard` navigation
- a productized `Generate` workspace
- honest placeholder workspaces for `Iterate` and `Storyboard`
- model capability metadata for `sora-2`, `sora-2-pro`, future `veo`, and future `seedance`
- browser-safe image-picker fallback for non-Tauri local development
- reactive settings usage in the app orchestration flow
- lightweight in-memory Recent Jobs visibility in Generate mode

The remaining strategic blocker is no longer upload. The actual unresolved product blocker is missing backend semantics for:
- chat-style iterative edit/remix workflows
- true storyboard or multi-shot generation semantics
