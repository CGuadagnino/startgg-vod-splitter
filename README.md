# start.gg VOD Splitter

Desktop app (and web tool) for splitting tournament VODs into per-set clips using start.gg set timestamps. Built for the FGC -- no more manual VOD splitting after your weeklies.

## How it works

1. Enter your start.gg event URL or slug
2. Fetch sets and pick your station number
3. Pick your VOD file
4. Set the recording start time (auto-detected from OBS filenames)
5. Edit titles, start times, and durations as needed
6. Compute cuts, then either:
   - **Desktop app:** Click "Split with ffmpeg" and watch the progress bar
   - **Web version:** Export ffmpeg commands, scripts, JSON, or CSV

## Desktop App (Tauri)

The desktop app bundles ffmpeg so everything happens in one window -- pick your VOD, compute cuts, split. Done.

### Prerequisites

- [Rust](https://rustup.rs/) (for building)
- [Node.js](https://nodejs.org/) 18+

### Setup

```bash
# Install JS dependencies
npm install

# Download ffmpeg and set up as Tauri sidecar
# Follow the instructions printed by this script:
node setup-ffmpeg.mjs

# Run in development
npm run tauri dev
```

### Building for release

```bash
npm run tauri build
```

This produces a platform-specific installer in `src-tauri/target/release/bundle/`.

### ffmpeg sidecar setup

Tauri bundles ffmpeg as a "sidecar" binary. The setup script (`setup-ffmpeg.mjs`) handles the naming convention, but you need to provide the binary:

1. Download a static ffmpeg build for your platform
2. Place `ffmpeg` (or `ffmpeg.exe`) in `src-tauri/binaries/`
3. Run `node setup-ffmpeg.mjs` to rename it correctly

If the sidecar binary isn't found at runtime, the app falls back to system ffmpeg (i.e. whatever's in your PATH).

## Web Version

The same React frontend also works as a standalone web tool (without the in-app splitting). For web deployment, you'd need a CORS proxy for the start.gg API -- the Tauri desktop app doesn't need this since Rust handles the fetch directly.

```bash
npm run dev     # local development
npm run build   # static export to ./out
```

## Architecture

- **Frontend:** React + TypeScript + Tailwind CSS (shared between desktop and web)
- **Desktop backend:** Rust via Tauri v2
  - `fetch_startgg` -- direct GraphQL to start.gg (no CORS issues)
  - `split_vod` -- runs bundled ffmpeg per cut with progress events
  - Native file/folder dialogs via `tauri-plugin-dialog`
- **Web fallback:** All client-side except start.gg fetch (needs a proxy)

## Project layout

```
src/
  app/
    page.tsx                    # main app page (state orchestration)
    layout.tsx                  # root layout
    globals.css                 # tailwind + dark mode styles
  components/
    SettingsPanel.tsx            # persistent folder paths + OS config
    EventInput.tsx              # slug + tournament name inputs
    StationSelector.tsx         # station dropdown
    VodPicker.tsx               # native file picker (Tauri) / browser fallback
    RecordingStart.tsx          # date/time picker for recording start
    SetList.tsx                 # scrollable set list container
    SetRow.tsx                  # individual editable set row
    CutList.tsx                 # computed cuts display
    SplitPanel.tsx              # Tauri-only: ffmpeg split with progress UI
    ExportPanel.tsx             # JSON, CSV, ffmpeg script exports
  lib/
    types.ts                    # shared TypeScript types
    startgg.ts                  # GraphQL client (Tauri invoke / web fetch)
    vod.ts                      # cut computation + time math
    ffmpeg.ts                   # ffmpeg command/script generation (web export)
    tauri.ts                    # Tauri-specific: native dialogs, split, paths
    storage.ts                  # localStorage helpers
  hooks/
    useSettings.ts              # React hook for persistent settings
src-tauri/
  src/
    lib.rs                      # Rust backend: Tauri commands
    main.rs                     # entry point
  binaries/                     # ffmpeg sidecar binary (per-platform)
  capabilities/default.json     # Tauri permissions
  tauri.conf.json               # Tauri app config
  Cargo.toml                    # Rust dependencies
```

## License

Use and modify as you like.
