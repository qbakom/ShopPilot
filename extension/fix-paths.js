const fs = require("fs");
const path = require("path");

const dirs = [
  path.join(__dirname, "build", "chrome-mv3-dev"),
  path.join(__dirname, "build", "chrome-mv3-prod"),
];

function fixDir(dir) {
  if (!fs.existsSync(dir)) return;
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
    }
  }
}

function run() {
  dirs.forEach(fixDir);
}

if (process.argv.includes("--watch")) {
  run();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    fs.watch(dir, (event, filename) => {
      if (filename && filename.endsWith(".html")) {
        setTimeout(() => fixDir(dir), 200);
      }
    });
  }
  console.log("Watching for HTML changes...");
} else {
  run();
}
