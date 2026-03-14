/**
 * setup-ffmpeg.mjs
 *
 * Downloads a static ffmpeg binary and renames it for Tauri's sidecar
 * naming convention: ffmpeg-{target-triple}[.exe]
 *
 * Run: node setup-ffmpeg.mjs
 *
 * This is a dev-time helper. You only need to run it once per platform.
 * The binary goes into src-tauri/binaries/ and gets bundled with the app.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, renameSync, chmodSync } from "fs";
import { join } from "path";

const BINARIES_DIR = join("src-tauri", "binaries");

// Get the current platform's target triple from rustc
function getTargetTriple() {
  try {
    // Rust 1.84+
    return execSync("rustc --print host-tuple", { encoding: "utf8" }).trim();
  } catch {
    // Fallback for older rustc
    const info = execSync("rustc -vV", { encoding: "utf8" });
    const match = /host: (\S+)/.exec(info);
    if (!match) throw new Error("Could not determine target triple from rustc");
    return match[1];
  }
}

function main() {
  const triple = getTargetTriple();
  const isWindows = triple.includes("windows");
  const ext = isWindows ? ".exe" : "";
  const targetName = `ffmpeg-${triple}${ext}`;
  const targetPath = join(BINARIES_DIR, targetName);

  console.log(`Platform: ${triple}`);
  console.log(`Target:   ${targetPath}`);

  if (!existsSync(BINARIES_DIR)) {
    mkdirSync(BINARIES_DIR, { recursive: true });
  }

  if (existsSync(targetPath)) {
    console.log("\nffmpeg sidecar already exists. Delete it to re-download.");
    return;
  }

  // Check if there's a plain ffmpeg binary already in the dir to rename
  const plainName = `ffmpeg${ext}`;
  const plainPath = join(BINARIES_DIR, plainName);
  if (existsSync(plainPath)) {
    console.log(`\nFound ${plainName}, renaming to ${targetName}...`);
    renameSync(plainPath, targetPath);
    if (!isWindows) chmodSync(targetPath, 0o755);
    console.log("Done!");
    return;
  }

  console.log(`
=== Manual setup required ===

1. Download a static ffmpeg build for your platform:

   Windows: https://github.com/BtbN/FFmpeg-Builds/releases
            (ffmpeg-master-latest-win64-gpl.zip → extract ffmpeg.exe)

   macOS:   https://evermeet.cx/ffmpeg/
            (or: brew install ffmpeg, then copy the binary)

   Linux:   https://johnvansickle.com/ffmpeg/
            (ffmpeg-release-amd64-static.tar.xz → extract ffmpeg)

2. Place the binary in: ${BINARIES_DIR}/

3. Run this script again to rename it, OR rename manually to:
   ${targetName}

4. Verify: ls ${BINARIES_DIR}/
   Should show: ${targetName}
`);
}

main();
