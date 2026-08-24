// The sidecar process (DEC-063): spawn on the bundled Node runtime, route
// line-delimited JSON-RPC, forward events to the WebView, and restart on a
// crash. This file owns the process; every capability it serves lives in
// TypeScript (packages/ui/src/sidecar).
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::oneshot;

type Pending = Arc<Mutex<HashMap<u64, oneshot::Sender<Value>>>>;

struct Proc {
    stdin: ChildStdin,
    child: Child,
}

pub struct Sidecar {
    app: AppHandle,
    proc: Mutex<Option<Proc>>,
    pending: Pending,
    counter: AtomicU64,
    quitting: AtomicBool,
    /// Crash timestamps for the restart brake: 3 within a minute means the
    /// sidecar is not coming back and the user gets told instead of a loop.
    crashes: Mutex<Vec<Instant>>,
}

fn node_binary(packaged: bool) -> PathBuf {
    let exe_name = if cfg!(windows) { "node.exe" } else { "node" };
    if let Ok(explicit) = std::env::var("VERI_NODE") {
        return PathBuf::from(explicit);
    }
    if packaged {
        // externalBin lands next to the app binary: Contents/MacOS/ on
        // macOS, the install directory on Windows, usr/bin in the Linux
        // bundles (WO-092).
        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                return dir.join(exe_name);
            }
        }
    }
    // Dev: the fetched runtime if present (the same binary that ships),
    // otherwise whatever `node` the shell was launched with.
    let triple = if cfg!(target_os = "macos") {
        format!("{}-apple-darwin", std::env::consts::ARCH)
    } else if cfg!(target_os = "linux") {
        format!("{}-unknown-linux-gnu", std::env::consts::ARCH)
    } else {
        format!("{}-pc-windows-msvc.exe", std::env::consts::ARCH)
    };
    let fetched = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("binaries")
        .join(format!("node-{triple}"));
    if fetched.exists() {
        fetched
    } else {
        PathBuf::from(exe_name)
    }
}

fn sidecar_js(app: &AppHandle, packaged: bool) -> PathBuf {
    if let Ok(explicit) = std::env::var("VERI_SIDECAR") {
        return PathBuf::from(explicit);
    }
    if packaged {
        app.path()
            .resource_dir()
            .map(|d| d.join("sidecar/dist/sidecar/main.js"))
            .unwrap_or_else(|_| PathBuf::from("sidecar/dist/sidecar/main.js"))
    } else {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../dist/sidecar/main.js")
    }
}

impl Sidecar {
    pub fn new(app: AppHandle) -> Arc<Self> {
        Arc::new(Self {
            app,
            proc: Mutex::new(None),
            pending: Arc::new(Mutex::new(HashMap::new())),
            counter: AtomicU64::new(0),
            quitting: AtomicBool::new(false),
            crashes: Mutex::new(Vec::new()),
        })
    }

    pub fn spawn(self: &Arc<Self>) -> std::io::Result<()> {
        let packaged = !tauri::is_dev();
        let mut command = Command::new(node_binary(packaged));
        command
            .arg(sidecar_js(&self.app, packaged))
            .args(std::env::args().skip(1).find(|a| !a.starts_with('-')))
            .env("VERI_APP_VERSION", self.app.package_info().version.to_string())
            .env("VERI_PACKAGED", if packaged { "1" } else { "0" })
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit());
        // WO-092: a GUI-subsystem app spawning a console-subsystem child
        // (node.exe) flashes a console window on Windows; CREATE_NO_WINDOW
        // keeps the sidecar invisible, matching the other platforms.
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
        }
        let mut child = command.spawn()?;

        let stdin = child.stdin.take().expect("sidecar stdin");
        let stdout = child.stdout.take().expect("sidecar stdout");
        *self.proc.lock().unwrap() = Some(Proc { stdin, child });

        // Reader thread: route responses to their waiting command, forward
        // sidecar events to the WebView (the webContents.send analog). Ends
        // when the sidecar's stdout closes — deliberately on quit, or a crash.
        let this = self.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines() {
                let Ok(line) = line else { break };
                let Ok(msg) = serde_json::from_str::<Value>(&line) else { continue };
                if let Some(id) = msg.get("id").and_then(Value::as_u64) {
                    if let Some(tx) = this.pending.lock().unwrap().remove(&id) {
                        let _ = tx.send(msg);
                    }
                } else if let Some(event) = msg.get("event").and_then(Value::as_str) {
                    if event != "ready" {
                        let payload = msg.get("data").cloned().unwrap_or(Value::Null);
                        let _ = this.app.emit(&format!("veri-{event}"), payload);
                    }
                }
            }
            this.on_reader_end();
        });
        Ok(())
    }

    /// The one bridge: every window.veri method that used to be an
    /// ipcMain.handle travels through here to the sidecar.
    pub async fn call(&self, method: &str, params: Value) -> Result<Value, String> {
        let (tx, rx) = oneshot::channel::<Value>();
        let id = self.counter.fetch_add(1, Ordering::SeqCst) + 1;
        self.pending.lock().unwrap().insert(id, tx);
        {
            let mut guard = self.proc.lock().unwrap();
            let Some(proc) = guard.as_mut() else {
                self.pending.lock().unwrap().remove(&id);
                return Err("sidecar unavailable".into());
            };
            let line = json!({ "id": id, "method": method, "params": params });
            if let Err(err) = writeln!(proc.stdin, "{line}") {
                self.pending.lock().unwrap().remove(&id);
                return Err(format!("sidecar write: {err}"));
            }
        }
        let msg = tokio::time::timeout(Duration::from_secs(120), rx)
            .await
            .map_err(|_| format!("sidecar timeout on {method}"))?
            .map_err(|_| "sidecar dropped".to_string())?;
        if msg.get("ok").and_then(Value::as_bool) == Some(true) {
            Ok(msg.get("result").cloned().unwrap_or(Value::Null))
        } else {
            Err(msg
                .get("error")
                .and_then(Value::as_str)
                .unwrap_or("sidecar error")
                .to_string())
        }
    }

    /// Fire-and-forget log line into ~/Library/Logs/Veri via the sidecar —
    /// one log, one writer (DEC-034); the shell's own outcomes ride along.
    pub fn log(self: &Arc<Self>, level: &'static str, message: String) {
        let this = self.clone();
        tauri::async_runtime::spawn(async move {
            let _ = this.call("log", json!([level, message])).await;
        });
    }

    pub fn kill(&self) {
        self.quitting.store(true, Ordering::SeqCst);
        if let Some(proc) = self.proc.lock().unwrap().as_mut() {
            let _ = proc.child.kill();
        }
    }

    /// Stdout closed. On quit that is the plan; otherwise the sidecar died
    /// under the renderer — respawn, re-open the current project (the MRU
    /// head, which pointAppAt maintains), and nudge the renderer to re-pull
    /// its snapshot. Three crashes inside a minute stop the loop and tell
    /// the user where the log is.
    fn on_reader_end(self: &Arc<Self>) {
        if self.quitting.load(Ordering::SeqCst) {
            return;
        }
        *self.proc.lock().unwrap() = None;
        self.pending.lock().unwrap().clear(); // in-flight calls fail as "sidecar dropped"

        let now = Instant::now();
        {
            let mut crashes = self.crashes.lock().unwrap();
            crashes.retain(|t| now.duration_since(*t) < Duration::from_secs(60));
            crashes.push(now);
            if crashes.len() >= 3 {
                eprintln!("[shell] sidecar crashed 3x within a minute; giving up");
                let app = self.app.clone();
                tauri::async_runtime::spawn(async move {
                    crate::dialogs::alert(
                        &app,
                        "Veri's background process keeps crashing",
                        "See ~/Library/Logs/Veri/main.log for details, and consider filing an issue from Help → Report an Issue.",
                    )
                    .await;
                    app.exit(1);
                });
                return;
            }
        }

        eprintln!("[shell] sidecar exited unexpectedly; restarting");
        let this = self.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(Duration::from_millis(500)).await;
            if this.spawn().is_err() {
                eprintln!("[shell] sidecar respawn failed");
                return;
            }
            // The fresh process resolves the same project the crashed one had
            // open: pointAppAt keeps the MRU head current.
            if let Ok(res) = this.call("launch-resolve", json!([])).await {
                if let Some(root) = res.get("root").and_then(Value::as_str) {
                    if res.get("operable").and_then(Value::as_bool) == Some(true) {
                        let _ = this.call("point-at", json!([root])).await;
                    }
                }
            }
            this.log("warn", "sidecar restarted after an unexpected exit".into());
            // Same event external edits use: the renderer re-pulls the
            // snapshot from the fresh sidecar.
            let _ = this.app.emit("veri-changed", Value::Null);
        });
    }
}
