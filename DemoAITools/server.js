const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("node:child_process");
const path = require("node:path");

const app = express();
app.use(cors());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

const run = (cmd) =>
  new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) resolve("❌ Error");
      else resolve(stdout.trim());
    });
  });

app.post("/transcribe-all", upload.single("audio"), async (req, res) => {
  const audioPath = req.file.path;

  const [whisper, qwen, google] = await Promise.all([
    run(`python whisper_transcribe.py ${audioPath}`),
    run(`python qwen_transcribe.py ${audioPath}`),
    run(`python google_transcribe.py ${audioPath}`)
  ]);

  res.json({ whisper, qwen, google });
});

app.listen(3000, () => {
  console.log("🚀 Running at http://localhost:3000");
});
