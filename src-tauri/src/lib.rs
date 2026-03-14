//! start.gg VOD Splitter - Tauri backend.
//!
//! Provides three capabilities the web version couldn't:
//!   1. Direct start.gg GraphQL fetch (no CORS, no proxy)
//!   2. ffmpeg execution via bundled sidecar with per-clip progress events
//!   3. Native file/folder dialogs that return real full paths

use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::Emitter;
use tauri::Manager;

// ─── start.gg GraphQL ────────────────────────────────────────────────

const STARTGG_API: &str = "https://www.start.gg/api/-/gql";

const EVENT_SETS_QUERY: &str = r#"
query EventQuery($slug: String!, $page: Int!) {
  event(slug: $slug) {
    id
    name
    sets(page: $page, perPage: 50, sortType: RECENT) {
      pageInfo { totalPages }
      nodes {
        id
        startedAt
        completedAt
        fullRoundText
        winnerId
        station { number }
        games {
          selections {
            entrant { id name }
            character { name }
          }
        }
      }
    }
  }
}
"#;

/// Fetch a single page of sets from start.gg.
/// Called from the frontend; handles pagination client-side.
#[tauri::command]
async fn fetch_startgg(slug: String, page: u32) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    let payload = serde_json::json!({
        "operationName": "EventQuery",
        "variables": { "slug": slug, "page": page },
        "query": EVENT_SETS_QUERY,
    });

    let res = client
        .post(STARTGG_API)
        .header("Content-Type", "application/json")
        .header("client-version", "20")
        .header("User-Agent", "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if !res.status().is_success() {
        return Err(format!("start.gg returned HTTP {}", res.status()));
    }

    let data: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    Ok(data)
}

// ─── ffmpeg splitting ────────────────────────────────────────────────

/// A single cut to execute with ffmpeg.
#[derive(Debug, Deserialize)]
struct CutEntry {
    start_sec: f64,
    end_sec: f64,
    filename: String,
}

/// Progress event emitted to the frontend for each clip.
#[derive(Debug, Serialize, Clone)]
struct SplitProgress {
    index: usize,
    total: usize,
    filename: String,
    status: String, // "started" | "done" | "error"
    error: Option<String>,
}

/// Find the ffmpeg binary, checking multiple locations:
/// 1. Sidecar in resource dir (production build)
/// 2. binaries/ folder in the Tauri project (dev mode)
/// 3. System PATH fallback
fn find_ffmpeg(app: &tauri::AppHandle) -> String {
    let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };

    // Get the target triple for sidecar naming
    let triple = if cfg!(target_os = "windows") {
        "x86_64-pc-windows-msvc"
    } else if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            "aarch64-apple-darwin"
        } else {
            "x86_64-apple-darwin"
        }
    } else {
        "x86_64-unknown-linux-gnu"
    };

    let candidates: Vec<std::path::PathBuf> = vec![
        // Production: resource dir contains the sidecar with target triple
        app.path()
            .resource_dir()
            .ok()
            .map(|d| d.join(format!("binaries/ffmpeg-{triple}{ext}")))
            .unwrap_or_default(),
        // Production: plain name
        app.path()
            .resource_dir()
            .ok()
            .map(|d| d.join(format!("binaries/ffmpeg{ext}")))
            .unwrap_or_default(),
        // Dev mode: binaries/ folder in src-tauri (with target triple)
        std::path::PathBuf::from(format!("binaries/ffmpeg-{triple}{ext}")),
        // Dev mode: plain name
        std::path::PathBuf::from(format!("binaries/ffmpeg{ext}")),
    ];

    for path in &candidates {
        if path.exists() {
            eprintln!("[vod-splitter] Using ffmpeg at: {}", path.display());
            return path.to_string_lossy().to_string();
        }
    }

    // Fall back to system ffmpeg
    eprintln!("[vod-splitter] No bundled ffmpeg found, falling back to system PATH");
    "ffmpeg".to_string()
}

/// Split a VOD into clips using the bundled ffmpeg sidecar.
///
/// Runs each cut sequentially, emitting progress events so the
/// frontend can show a live progress bar. Uses -c copy for speed
/// (no re-encoding) and -loglevel error to suppress noise.
#[tauri::command]
async fn split_vod(
    app: tauri::AppHandle,
    vod_path: String,
    output_dir: String,
    cuts: Vec<CutEntry>,
) -> Result<Vec<bool>, String> {
    // Resolve the ffmpeg binary path.
    // Check multiple locations: sidecar in resource dir (production),
    // binaries/ folder relative to the Tauri project (dev mode),
    // and finally fall back to system PATH.
    let ffmpeg = find_ffmpeg(&app);

    // Ensure output directory exists
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output directory: {e}"))?;

    let total = cuts.len();
    let mut results = Vec::with_capacity(total);

    for (i, cut) in cuts.iter().enumerate() {
        let duration = cut.end_sec - cut.start_sec;
        let out_path = std::path::Path::new(&output_dir).join(format!("{}.mp4", &cut.filename));

        // Emit "started" event
        let _ = app.emit(
            "split-progress",
            SplitProgress {
                index: i,
                total,
                filename: cut.filename.clone(),
                status: "started".into(),
                error: None,
            },
        );

        // Run ffmpeg: -ss before -i for fast seek, -c copy for no re-encode
        let output = Command::new(&ffmpeg)
            .args([
                "-y",
                "-ss",
                &format!("{:.1}", cut.start_sec),
                "-i",
                &vod_path,
                "-t",
                &format!("{:.1}", duration),
                "-c",
                "copy",
                "-loglevel",
                "error",
            ])
            .arg(out_path.to_string_lossy().as_ref())
            .output();

        match output {
            Ok(out) if out.status.success() => {
                let _ = app.emit(
                    "split-progress",
                    SplitProgress {
                        index: i,
                        total,
                        filename: cut.filename.clone(),
                        status: "done".into(),
                        error: None,
                    },
                );
                results.push(true);
            }
            Ok(out) => {
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                let _ = app.emit(
                    "split-progress",
                    SplitProgress {
                        index: i,
                        total,
                        filename: cut.filename.clone(),
                        status: "error".into(),
                        error: Some(stderr.clone()),
                    },
                );
                results.push(false);
            }
            Err(e) => {
                let _ = app.emit(
                    "split-progress",
                    SplitProgress {
                        index: i,
                        total,
                        filename: cut.filename.clone(),
                        status: "error".into(),
                        error: Some(format!("Failed to run ffmpeg: {e}")),
                    },
                );
                results.push(false);
            }
        }
    }

    Ok(results)
}

// ─── App setup ───────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![fetch_startgg, split_vod])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
