/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Landmark, SavedGesture, RecognitionResult } from '../types';

// Standard 3D distance between two landmarks
export function getDistance(a: Landmark, b: Landmark): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + 
    Math.pow(a.y - b.y, 2) + 
    Math.pow(a.z - b.z, 2)
  );
}

/**
 * Normalizes a hand coordinate set (21 landmarks) to be invariant of screen position and scale.
 * 1. Translational Invariance: Moves the wrist (landmark 0) to (0,0,0).
 * 2. Scale Invariance: Scales all joints so that the distance from wrist (0) to middle finger MCP (9) is exactly 1.0.
 */
export function normalizeHand(landmarks: Landmark[]): Landmark[] {
  if (!landmarks || landmarks.length < 21) return [];

  const wrist = landmarks[0];
  const middleMCP = landmarks[9];
  
  // Calculate palm size scale factor
  const scale = getDistance(wrist, middleMCP);
  const scaleFactor = scale > 0.0001 ? scale : 1.0;

  return landmarks.map((lm) => ({
    x: (lm.x - wrist.x) / scaleFactor,
    y: (lm.y - wrist.y) / scaleFactor,
    z: (lm.z - wrist.z) / scaleFactor,
  }));
}

/**
 * Computes the Euclidean distance between two normalized coordinate vectors
 */
export function computeEuclideanDistance(a: Landmark[], b: Landmark[]): number {
  if (a.length !== b.length || a.length === 0) return 999;
  
  let sumSquaredDiff = 0;
  for (let i = 0; i < a.length; i++) {
    sumSquaredDiff += Math.pow(a[i].x - b[i].x, 2) +
                      Math.pow(a[i].y - b[i].y, 2) +
                      Math.pow(a[i].z - b[i].z, 2);
  }
  return Math.sqrt(sumSquaredDiff);
}

/**
 * Computes Cosine Similarity between two sets of landmarks by flattening them into vector spaces.
 */
export function computeCosineSimilarity(a: Landmark[], b: Landmark[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  // Flatten landmarks into simple arrays of coordinates
  const vecA: number[] = [];
  const vecB: number[] = [];

  for (let i = 0; i < a.length; i++) {
    vecA.push(a[i].x, a[i].y, a[i].z);
    vecB.push(b[i].x, b[i].y, b[i].z);
  }

  // Calculate dot product and norms
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator < 0.0001) return 0;
  return dotProduct / denominator;
}

/**
 * Compares live hand frames with a library of stored gestures and returns the closest match, if any.
 * @param liveLeft Live left hand landmarks (un-normalized)
 * @param liveRight Live right hand landmarks (un-normalized)
 * @param storedGestures Stored custom or predefined gestures
 * @param matchAlgorithm 'euclidean' or 'cosine'
 * @param confidenceThreshold Minimum threshold percent (e.g. 70) to count as a match
 */
export function recognizeGesture(
  liveLeft: Landmark[] | null,
  liveRight: Landmark[] | null,
  storedGestures: SavedGesture[],
  matchAlgorithm: 'euclidean' | 'cosine' = 'euclidean',
  confidenceThreshold: number = 75
): RecognitionResult | null {
  // Filter out untrained slots
  const activeGestures = storedGestures.filter((g) => g.isTrained && g.landmarks && g.landmarks.length > 0);
  if (activeGestures.length === 0) return null;

  let bestMatch: SavedGesture | null = null;
  let highestConf = 0;

  // Normalize live hands
  const normLeft = liveLeft ? normalizeHand(liveLeft) : null;
  const normRight = liveRight ? normalizeHand(liveRight) : null;

  for (const gesture of activeGestures) {
    let confidence = 0;

    if (gesture.hand === 'both') {
      // Must have both hands detected in the live stream
      if (!normLeft || !normRight) continue;

      // Stored landmarks contains 42 elements: first 21 Left, second 21 Right
      const storedLeft = gesture.landmarks.slice(0, 21);
      const storedRight = gesture.landmarks.slice(21, 42);

      if (storedLeft.length < 21 || storedRight.length < 21) continue;

      if (matchAlgorithm === 'euclidean') {
        const distLeft = computeEuclideanDistance(storedLeft, normLeft);
        const distRight = computeEuclideanDistance(storedRight, normRight);
        const avgDist = (distLeft + distRight) / 2;

        // Euclidean maximum expected difference for normalized hands is around 1.1 per hand
        confidence = Math.max(0, Math.min(100, 100 * (1 - avgDist / 1.05)));
      } else {
        // Cosine similarity
        const simLeft = computeCosineSimilarity(storedLeft, normLeft);
        const simRight = computeCosineSimilarity(storedRight, normRight);
        const avgSim = (simLeft + simRight) / 2;

        // Map range [0.85, 1.0] to [0%, 100%]
        confidence = Math.max(0, Math.min(100, ((avgSim - 0.85) / 0.15) * 100));
      }
    } else if (gesture.hand === 'left') {
      // Compare only with the left hand
      if (!normLeft) continue;

      if (matchAlgorithm === 'euclidean') {
        const dist = computeEuclideanDistance(gesture.landmarks, normLeft);
        confidence = Math.max(0, Math.min(100, 100 * (1 - dist / 0.95)));
      } else {
        const sim = computeCosineSimilarity(gesture.landmarks, normLeft);
        confidence = Math.max(0, Math.min(100, ((sim - 0.85) / 0.15) * 100));
      }
    } else {
      // Compare only with the right hand
      if (!normRight) continue;

      if (matchAlgorithm === 'euclidean') {
        const dist = computeEuclideanDistance(gesture.landmarks, normRight);
        confidence = Math.max(0, Math.min(100, 100 * (1 - dist / 0.95)));
      } else {
        const sim = computeCosineSimilarity(gesture.landmarks, normRight);
        confidence = Math.max(0, Math.min(100, ((sim - 0.85) / 0.15) * 100));
      }
    }

    if (confidence > highestConf) {
      highestConf = confidence;
      bestMatch = gesture;
    }
  }

  if (bestMatch && highestConf >= confidenceThreshold) {
    return {
      label: bestMatch.label,
      confidence: Math.round(highestConf),
      hand: bestMatch.hand,
    };
  }

  return null;
}
