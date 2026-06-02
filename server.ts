/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Load environment variables (.env / secrets injected by AI Studio)
dotenv.config();

const app = express();
const PORT = 3000;

// Setup JSON serialization middleware
app.use(express.json({ limit: '10mb' }));

// Dedicated API route for Biomechanical review using Gemini API
app.post('/api/biomechanical-review', async (req, res) => {
  try {
    const { trackingDuration, gesturesDetected, averageOpenScore, maxSpeed, eventHistory } = req.body;

    // Check if Gemini API key exists
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: "GEMINI_API_KEY is not configured in the workspace secrets. Please add it in the Settings panel."
      });
    }

    // Initialize Google Gen AI client with appropriate telemetry header
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
You are a top-tier physical therapist, biomechanical researcher, and hand ergonomics specialist. 
The user has completed a hand-movement session tracked via real-time computer vision (MediaPipe Hands).
Here is the recorded telemetry:
- **Session Duration**: ${trackingDuration} seconds
- **Average Hand Openness Score (0 is clenched fist, 1 is flat fingers)**: ${averageOpenScore}
- **Maximum Hand Speed detected (normalized)**: ${maxSpeed}
- **Detected Hand Gestures Dictionary**: ${JSON.stringify(gesturesDetected)}
- **Timeline of events**: ${JSON.stringify(eventHistory)}

Please generate a professional, highly engaging, and clear Biomechanical & Ergonomic feedback report in Markdown format.
Include the following exact sections with professional bold headings:
1. **Executive Motion Summary**: Give an analytical overview of their session, movement fluency, and what their gesture mix suggests.
2. **Ergonomic Risk & Posture Analysis**: Discuss potential strain risks associated with their gestures. For example, repetitive fists can represent gripping strain, prolonged pointing is index strain, open-palm is stretching but can tense after long hours. Also discuss how to maintain optimal wrist posture.
3. **Targeted Hand & Wrist Exercises**: Provide 3 customized physical therapy exercises/stretches (e.g. finger extensions, tendon glides, wrist flexes) based on their specific gesture statistics, with step-by-step instructions.
4. **General Digital Hygiene Tips**: Provide practical advice on rest intervals (such as the 20-20-20 rule) and keyboard/mouse postures.

Be positive, encouraging, scientifically grounded, and concise. Avoid references to deep developer details; focus purely on the human user's biomechanics.
    `;

    // Query Gemini model
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const reportMarkdown = response.text || 'Unable to generate analysis report.';

    return res.json({
      success: true,
      report: reportMarkdown
    });

  } catch (error: any) {
    console.error('Error generating ergonomic report:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An internal error occurred during the assessment.'
    });
  }
});

// Configure Vite or Static File serving depending on environment
async function setupRouting() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running in DEVELOPMENT mode. Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    app.use(vite.middlewares);
  } else {
    console.log('Running in PRODUCTION mode. Serving pre-compiled distribution bundle...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Hand Movement Tracker Server] running on http://localhost:${PORT}`);
  });
}

setupRouting();
