/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Landmark {
  x: number; // 0 to 1, relative to image width
  y: number; // 0 to 1, relative to image height
  z: number; // depth, wrist-relative
}

export type HandLandmarksList = Landmark[]; // Exactly 21 landmarks

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

export type HandGesture = 
  | 'None'
  | 'Fist'
  | 'High Five'
  | 'Peace'
  | 'Thumbs Up'
  | 'Thumbs Down'
  | 'OK'
  | 'Pointing'
  | 'Rock On'
  | 'Pinch';

export interface TrackingMetrics {
  timestamp: number;
  activeHandCount: number;
  handOpenScore: number; // 0 to 1
  speed: number; // relative units per second
  gesture: HandGesture;
  handPosition: { x: number; y: number; z: number };
  boundingBox: BoundingBox | null;
  fingerStates: FingerStates | null;
}

export interface MovementLog {
  id: string;
  timestamp: number;
  event: string;
  details: string;
  type: 'info' | 'success' | 'warning' | 'gesture';
}

export interface DrawingPoint {
  x: number; // relative 0-1
  y: number; // relative 0-1
  isNewStroke?: boolean;
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  brushSize: number;
}

export interface AIReviewReport {
  overallRating: string;
  durationSeconds: number;
  gesturesSummary: Record<HandGesture, number>;
  biomechanicalAnalysis: string; // Markdown recommendations
  exercisesSuggested: string[];
}
