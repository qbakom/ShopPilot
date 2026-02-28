const fs = require("fs");
const path = require("path");

// Plasmo/Parcel generates absolute paths (href="/file.css") in HTML files.
// Chrome extensions require relative paths (href="./file.css").
// This script fixes them after each build.

const dirs = [
  path.join(__dirname, "build", "chrome-mv3-dev"),
  path.join(__dirname, "build", "chrome-mv3-prod"),
];

function fixDir(dir) {
  if (!fs.existsSync(dir)) return false;
  let changed = false;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".html")) continue;
    const fp = path.join(dir, file);
    const content = fs.readFileSync(fp, "utf8");
    const fixed = content
      .replace(/href="\//g, 'href="./')
      .replace(/src="\//g, 'src="./');
    if (fixed !== content) {
      fs.writeFileSync(fp, fixed);
      console.log("Fixed paths:", fp);
      changed = true;
    }
  }
  return changed;
}

function run() {
  dirs.forEach(fixDir);
}

if (process.argv.includes("--poll")) {
  // Polling mode for use alongside `plasmo dev`.
  // Checks every 2s instead of using fs.watch (which triggers Plasmo rebuild loops).
  console.log("Polling for HTML path fixes every 2s...");
  run();
  setInterval(run, 2000);
} else {
  // One-shot mode for `plasmo build`.
  run();
}
