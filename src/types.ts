/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Landmark {
  x: number; // 0 to 1, relative to image width
  y: number; // 0 to 1, relative to image height
  z: number; // depth, wrist-relative
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SavedGesture {
  id: string;
  label: string;
  hand: 'left' | 'right' | 'both';
  landmarks: Landmark[]; // length 21 for left/right, 42 for both (first 21 Left, next 21 Right)
  isPredefined?: boolean;
  isTrained?: boolean;
}

export interface RecognitionResult {
  label: string;
  confidence: number; // 0 to 100
  hand: 'left' | 'right' | 'both';
}

export interface TrackingMetrics {
  timestamp: number;
  activeHandCount: number;
  leftHandPresent: boolean;
  rightHandPresent: boolean;
  speed: number;
  recognizedGesture: RecognitionResult | null;
}

export interface MovementLog {
  id: string;
  timestamp: number;
  event: string;
  details: string;
  type: 'info' | 'success' | 'warning' | 'gesture';
}
