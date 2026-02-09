import express from "express";
import multer from "multer";
import cors from "cors";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

/**
 * Run python transcriber:
 * python3 transcribe_whisper.py <audioPath>
 */
function transcribeWithWhisper(audioPath) {
  return new Promise((resolve, reject) => {
    execFile(
      "python3",
      ["transcribe_whisper.py", audioPath],
      { maxBuffer: 1024 * 1024 * 10 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout.trim());
      }
    );
  });
}

/**
 * Summarize with Gemini (text in -> overview out)
 * This uses the official Google GenAI SDK *in Node*.
 */
async function summarizeWithGemini(text) {
  // npm i @google/genai
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
You are generating a SHORT, PARAPHRASED overview from feedback.
Rules:
- Do NOT copy sentences verbatim.
- Output:
  1) 1-2 sentence summary
  2) 3 bullet strengths (if present)
  3) 3 bullet improvements (if present)
  4) 2-3 concrete next steps

Feedback:
${text}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const audioPath = req.file.path;

    const transcript = await transcribeWithWhisper(audioPath);

    // cleanup
    fs.unlinkSync(audioPath);

    res.json({ transcript });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/overview", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "No text provided" });

    const overview = await summarizeWithGemini(text.trim());
    res.json({ overview });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/transcribe-and-overview", upload.single("audio"), async (req, res) => {
  try {
    const audioPath = req.file.path;

    const transcript = await transcribeWithWhisper(audioPath);
    fs.unlinkSync(audioPath);

    const overview = await summarizeWithGemini(transcript);

    res.json({ transcript, overview });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
