/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedGesture, Landmark } from '../types';

// Synthesize landmark structures for quick out-of-the-box working examples

// 1. Fully Open Palm (Flat hand like "B" or "High Five")
function createOpenPalmLandmarks(): Landmark[] {
  const pts: Landmark[] = [
    { x: 0.5, y: 0.85, z: 0.0 }, // Wrist [0]
    { x: 0.38, y: 0.78, z: -0.05 }, // Thumb CMC [1]
    { x: 0.28, y: 0.70, z: -0.09 }, // Thumb MCP [2]
    { x: 0.22, y: 0.62, z: -0.12 }, // Thumb IP [3]
    { x: 0.17, y: 0.55, z: -0.14 }, // Thumb Tip [4]
    { x: 0.38, y: 0.50, z: -0.05 }, // Index MCP [5]
    { x: 0.34, y: 0.35, z: -0.08 }, // Index PIP [6]
    { x: 0.31, y: 0.25, z: -0.10 }, // Index DIP [7]
    { x: 0.29, y: 0.16, z: -0.11 }, // Index Tip [8]
    { x: 0.46, y: 0.48, z: -0.05 }, // Middle MCP [9]
    { x: 0.44, y: 0.30, z: -0.08 }, // Middle PIP [10]
    { x: 0.42, y: 0.18, z: -0.11 }, // Middle DIP [11]
    { x: 0.40, y: 0.08, z: -0.12 }, // Middle Tip [12]
    { x: 0.54, y: 0.49, z: -0.06 }, // Ring MCP [13]
    { x: 0.54, y: 0.32, z: -0.09 }, // Ring PIP [14]
    { x: 0.54, y: 0.20, z: -0.11 }, // Ring DIP [15]
    { x: 0.54, y: 0.10, z: -0.12 }, // Ring Tip [16]
    { x: 0.62, y: 0.54, z: -0.07 }, // Pinky MCP [17]
    { x: 0.65, y: 0.42, z: -0.11 }, // Pinky PIP [18]
    { x: 0.67, y: 0.33, z: -0.13 }, // Pinky DIP [19]
    { x: 0.69, y: 0.24, z: -0.14 }  // Pinky Tip [20]
  ];
  return pts;
}

// 2. Closed Fist (Clenched hand like "A")
function createFistLandmarks(): Landmark[] {
  const pts: Landmark[] = [
    { x: 0.5, y: 0.85, z: 0.0 }, // Wrist [0]
    { x: 0.42, y: 0.80, z: -0.04 }, // Thumb CMC [1]
    { x: 0.38, y: 0.74, z: -0.07 }, // Thumb MCP [2]
    { x: 0.36, y: 0.69, z: -0.09 }, // Thumb IP [3]
    { x: 0.38, y: 0.66, z: -0.10 }, // Thumb Tip [4]
    { x: 0.38, y: 0.55, z: -0.04 }, // Index MCP [5]
    { x: 0.36, y: 0.63, z: -0.08 }, // Index PIP [6]
    { x: 0.38, y: 0.67, z: -0.10 }, // Index DIP [7]
    { x: 0.39, y: 0.71, z: -0.11 }, // Index Tip [8]
    { x: 0.46, y: 0.54, z: -0.05 }, // Middle MCP [9]
    { x: 0.46, y: 0.64, z: -0.09 }, // Middle PIP [10]
    { x: 0.47, y: 0.68, z: -0.11 }, // Middle DIP [11]
    { x: 0.48, y: 0.72, z: -0.12 }, // Middle Tip [12]
    { x: 0.54, y: 0.55, z: -0.06 }, // Ring MCP [13]
    { x: 0.54, y: 0.64, z: -0.09 }, // Ring PIP [14]
    { x: 0.54, y: 0.68, z: -0.11 }, // Ring DIP [15]
    { x: 0.54, y: 0.72, z: -0.12 }, // Ring Tip [16]
    { x: 0.62, y: 0.58, z: -0.07 }, // Pinky MCP [17]
    { x: 0.62, y: 0.66, z: -0.10 }, // Pinky PIP [18]
    { x: 0.61, y: 0.70, z: -0.11 }, // Pinky DIP [19]
    { x: 0.60, y: 0.74, z: -0.12 }  // Pinky Tip [20]
  ];
  return pts;
}

// 3. Thumbs Up ("YES") - Thumb pointing high, others closed
function createThumbsUpLandmarks(): Landmark[] {
  const pts: Landmark[] = [
    { x: 0.5, y: 0.85, z: 0.0 }, // Wrist [0]
    { x: 0.38, y: 0.75, z: -0.05 }, // Thumb CMC [1]
    { x: 0.28, y: 0.65, z: -0.09 }, // Thumb MCP [2]
    { x: 0.24, y: 0.55, z: -0.12 }, // Thumb IP [3]
    { x: 0.21, y: 0.45, z: -0.15 }, // Thumb Tip [4]
    ...createFistLandmarks().slice(5) // Clenched fingers
  ];
  return pts;
}

// 4. Thumbs Down ("NO") - Thumb pointing low, others closed
function createThumbsDownLandmarks(): Landmark[] {
  const pts: Landmark[] = [
    { x: 0.5, y: 0.35, z: 0.0 }, // Wrist [0]
    { x: 0.38, y: 0.45, z: -0.05 }, // Thumb CMC [1]
    { x: 0.28, y: 0.55, z: -0.09 }, // Thumb MCP [2]
    { x: 0.24, y: 0.65, z: -0.12 }, // Thumb IP [3]
    { x: 0.21, y: 0.75, z: -0.15 }, // Thumb Tip [4]
    ...createFistLandmarks().slice(5).map((p) => ({ ...p, y: p.y - 0.4 }))
  ];
  return pts;
}

// 5. Peace Sign ("PEACE" / "V") - Index and Middle finger fully extended, others closed
function createPeaceSignLandmarks(): Landmark[] {
  const open = createOpenPalmLandmarks();
  const fist = createFistLandmarks();
  const pts = [
    ...open.slice(0, 5), // Thumb CMC/Tip from open
    ...open.slice(5, 13), // Index & Middle extended from open
    ...fist.slice(13) // Ring & Pinky closed from fist
  ];
  return pts;
}

// Custom normalizer just for setup to ensure high-fidelity matching
function getDistanceLocal(a: Landmark, b: Landmark): number {
  return Math.sqrt(Math.pow(a.x-b.x,2)+Math.pow(a.y-b.y,2)+Math.pow(a.z-b.z,2));
}

function normalizeLocal(landmarks: Landmark[]): Landmark[] {
  const wrist = landmarks[0];
  const mcp = landmarks[9];
  const scale = getDistanceLocal(wrist, mcp);
  const scaleFactor = scale > 0.001 ? scale : 1.0;
  return landmarks.map(p => ({
    x: (p.x - wrist.x) / scaleFactor,
    y: (p.y - wrist.y) / scaleFactor,
    z: (p.z - wrist.z) / scaleFactor
  }));
}

export function getInitialPredefinedGestures(): SavedGesture[] {
  const gestures: SavedGesture[] = [];

  // Letters (26 Slots: A-Z)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  alphabet.forEach((char) => {
    let landmarks: Landmark[] = [];
    let isTrained = false;

    // Pre-train some examples using our synthesized models
    if (char === 'A') {
      landmarks = normalizeLocal(createFistLandmarks());
      isTrained = true;
    } else if (char === 'B') {
      landmarks = normalizeLocal(createOpenPalmLandmarks());
      isTrained = true;
    } else if (char === 'V') {
      landmarks = normalizeLocal(createPeaceSignLandmarks());
      isTrained = true;
    }

    gestures.push({
      id: `predefined-${char}`,
      label: char,
      hand: 'right',
      landmarks: landmarks,
      isPredefined: true,
      isTrained: isTrained
    });
  });

  // Numbers (10 Slots: 0-9)
  const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  numbers.forEach((num) => {
    gestures.push({
      id: `predefined-${num}`,
      label: `Num ${num}`,
      hand: 'right',
      landmarks: [],
      isPredefined: true,
      isTrained: false
    });
  });

  // Common ASL / greetings (14 Slots)
  const commonWords = [
    { label: 'HELLO', hand: 'right', landmarks: createOpenPalmLandmarks(), isTrained: true },
    { label: 'GOODBYE', hand: 'right', landmarks: [], isTrained: false },
    { label: 'YES', hand: 'right', landmarks: createThumbsUpLandmarks(), isTrained: true },
    { label: 'NO', hand: 'right', landmarks: createThumbsDownLandmarks(), isTrained: true },
    { label: 'LOVE', hand: 'right', landmarks: [], isTrained: false },
    { label: 'THANK YOU', hand: 'right', landmarks: [], isTrained: false },
    { label: 'PLEASE', hand: 'right', landmarks: [], isTrained: false },
    { label: 'SORRY', hand: 'right', landmarks: [], isTrained: false },
    { label: 'HELP', hand: 'both', landmarks: [], isTrained: false },
    { label: 'FRIEND', hand: 'both', landmarks: [], isTrained: false },
    { label: 'MORE', hand: 'both', landmarks: [], isTrained: false },
    { label: 'EAT', hand: 'right', landmarks: [], isTrained: false },
    { label: 'DRINK', hand: 'right', landmarks: [], isTrained: false },
    { label: 'HAPPY', hand: 'both', landmarks: [], isTrained: false }
  ];

  commonWords.forEach((word) => {
    gestures.push({
      id: `predefined-${word.label.toLowerCase().replace(' ', '-')}`,
      label: word.label,
      hand: word.hand as 'left' | 'right' | 'both',
      landmarks: word.landmarks.length > 0 ? normalizeLocal(word.landmarks) : [],
      isPredefined: true,
      isTrained: word.isTrained
    });
  });

  return gestures;
}
