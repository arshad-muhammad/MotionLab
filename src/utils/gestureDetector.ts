/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Landmark, FingerStates, HandGesture } from '../types';

// Standard 3D distance between two landmarks
export function getDistance(a: Landmark, b: Landmark): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + 
    Math.pow(a.y - b.y, 2) + 
    Math.pow(a.z - b.z, 2)
  );
}

// Check which fingers are extended
export function detectFingerStates(landmarks: Landmark[]): FingerStates {
  if (!landmarks || landmarks.length < 21) {
    return { thumb: false, index: false, middle: false, ring: false, pinky: false };
  }

  const wrist = landmarks[0];
  
  // For standard fingers, compare distance from Wrist to Tip vs PIP joint
  // If Tip is further from wrist than PIP, the finger is extended.
  const isIndexExtended = getDistance(wrist, landmarks[8]) > getDistance(wrist, landmarks[6]);
  const isMiddleExtended = getDistance(wrist, landmarks[12]) > getDistance(wrist, landmarks[10]);
  const isRingExtended = getDistance(wrist, landmarks[16]) > getDistance(wrist, landmarks[14]);
  const isPinkyExtended = getDistance(wrist, landmarks[20]) > getDistance(wrist, landmarks[18]);

  // For the thumb, compare the distance from the thumb tip to the index finger MCP (base of index)
  // If it's far, the thumb is extended.
  const thumbTip = landmarks[4];
  const indexMCP = landmarks[5];
  const thumbBase = landmarks[2];
  
  const thumbToIndexBaseDist = getDistance(thumbTip, indexMCP);
  const thumbBaseToIndexBaseDist = getDistance(thumbBase, indexMCP);
  
  // If the thumb tip is pushed out away from the index finger base, it is extended
  const isThumbExtended = thumbToIndexBaseDist > thumbBaseToIndexBaseDist * 1.1;

  return {
    thumb: isThumbExtended,
    index: isIndexExtended,
    middle: isMiddleExtended,
    ring: isRingExtended,
    pinky: isPinkyExtended,
  };
}

// Classify gesture from 21 hand landmarks
export function classifyGesture(landmarks: Landmark[]): HandGesture {
  if (!landmarks || landmarks.length < 21) return 'None';

  const fingers = detectFingerStates(landmarks);
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  // 1. Pinch or OK checking: distance between thumb tip and index tip is very small
  const thumbIndexDist = getDistance(thumbTip, indexTip);
  // Normalize threshold based on palm size (distance from wrist to middle finger MCP)
  const palmBase = landmarks[9];
  const palmSize = getDistance(wrist, palmBase);
  
  const isPinching = thumbIndexDist < palmSize * 0.25;

  if (isPinching) {
    // If other fingers are extended, it's an "OK" gesture
    if (fingers.middle && fingers.ring && fingers.pinky) {
      return 'OK';
    }
    // Otherwise, standard pinch
    return 'Pinch';
  }

  // 2. Fist: All fingers are closed
  if (!fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    return 'Fist';
  }

  // 3. High Five / Open Palm: All fingers are extended
  if (fingers.index && fingers.middle && fingers.ring && fingers.pinky) {
    return 'High Five';
  }

  // 4. Peace: Index and Middle are extended, Ring and Pinky are closed
  if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
    return 'Peace';
  }

  // 5. Thumbs Up / Thumbs Down: Thumb is extended, everyone else is tucked
  if (fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    // Check orientation: if thumb tip is above wrist (y is smaller) or below wrist
    if (thumbTip.y < wrist.y) {
      return 'Thumbs Up';
    } else {
      return 'Thumbs Down';
    }
  }

  // 6. Pointing: Only index is extended
  if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    return 'Pointing';
  }

  // 7. Rock On: Index and Pinky are extended, others are closed
  if (fingers.index && fingers.pinky && !fingers.middle && !fingers.ring) {
    return 'Rock On';
  }

  return 'None';
}

// Calculate generic palm open score from 0 (closed fist) to 1 (fully open)
export function calculateHandOpenScore(landmarks: Landmark[]): number {
  if (!landmarks || landmarks.length < 21) return 0;
  
  const wrist = landmarks[0];
  const palmBase = landmarks[9];
  const palmSize = getDistance(wrist, palmBase);
  if (palmSize === 0) return 0;

  // Let's sum the distances of the 5 finger tips to the wrist, normalized by palm size
  const tips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
  let scoreSum = 0;

  for (const tip of tips) {
    const dist = getDistance(wrist, tip);
    // Relative distance compared to palm size
    scoreSum += dist / palmSize;
  }

  // Normalize mapping (usually 5 fingers fully extended sums to ~10-14 relative palm sizes, fist sums to ~3-4)
  const minExpected = 4;
  const maxExpected = 11;
  const score = (scoreSum - minExpected) / (maxExpected - minExpected);

  return Math.max(0, Math.min(1, score));
}
