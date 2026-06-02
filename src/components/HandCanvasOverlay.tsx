/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { Landmark, HandGesture, BoundingBox, DrawingStroke } from '../types';

interface HandCanvasOverlayProps {
  landmarksList: Landmark[][];
  activeGesture: HandGesture;
  boundingBox: BoundingBox | null;
  drawMode: boolean;
  brushColor: string;
  brushSize: number;
  strokes: DrawingStroke[];
}

export default function HandCanvasOverlay({
  landmarksList,
  activeGesture,
  boundingBox,
  drawMode,
  brushColor,
  brushSize,
  strokes,
}: HandCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Connection lines mapping for hand skeleton: [from, to]
  const skeletonConnections = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index finger
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle finger
    [9, 10], [10, 11], [11, 12],
    // Ring finger
    [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Knuckle bar
    [5, 9], [9, 13], [13, 17],
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing dynamically based on the display size of the canvas
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, []);

  // Drawing Loop on Landmark Changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear previous frames
    ctx.clearRect(0, 0, width, height);

    // Draw Persistent Whiteboard Strokes (Air Doodles)
    if (strokes && strokes.length > 0) {
      strokes.forEach((stroke) => {
        if (stroke.points.length < 1) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 4;
        ctx.shadowColor = stroke.color;

        stroke.points.forEach((point, pIdx) => {
          // Mirrored coordinate system mapping
          const px = width - (point.x * width);
          const py = point.y * height;

          if (pIdx === 0 || point.isNewStroke) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        });
        ctx.stroke();
      });
      // Reset shadows
      ctx.shadowBlur = 0;
    }

    // Since we want drawings to persist even if there are no active hands detected,
    // we do not return early if landmarksList is empty unless we draw hands!
    if (landmarksList && landmarksList.length > 0) {
      // Render each detected hand
      landmarksList.forEach((landmarks) => {
      if (landmarks.length < 21) return;

      // Draw Connection Lines (Skeletons)
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(209, 255, 38, 0.85)'; // Neon lime (#D1FF26)
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#D1FF26';

      skeletonConnections.forEach(([fromIdx, toIdx]) => {
        const fromNode = landmarks[fromIdx];
        const toNode = landmarks[toIdx];

        // Apply javascript horizontal mirroring: x goes from 1-x
        const startX = width - (fromNode.x * width);
        const startY = fromNode.y * height;
        const endX = width - (toNode.x * width);
        const endY = toNode.y * height;

        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
      });
      ctx.stroke();

      // Reset shadows for solid node drawing
      ctx.shadowBlur = 0;

      // Draw Joint Nodes (Landmarks)
      landmarks.forEach((landmark, index) => {
        const xPoint = width - (landmark.x * width);
        const yPoint = landmark.y * height;

        ctx.beginPath();
        
        if (index === 4 || index === 8 || index === 12 || index === 16 || index === 20) {
          // Tips - Glowing pure white tips with neon lime outline
          ctx.arc(xPoint, yPoint, 6, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#D1FF26';
          ctx.lineWidth = 2.5;
        } else if (index === 0) {
          // Wrist - Neon lime node
          ctx.arc(xPoint, yPoint, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#D1FF26';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
        } else {
          // Standard joints - subtle semi-transparent lime
          ctx.arc(xPoint, yPoint, 4, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(209, 255, 38, 0.65)';
          ctx.strokeStyle = 'rgba(10, 10, 10, 0.7)';
          ctx.lineWidth = 1;
        }
        
        ctx.fill();
        ctx.stroke();
      });

      // Draw Target Crosshair near index finger for styling
      const indexTip = landmarks[8];
      if (indexTip) {
        const indexX = width - (indexTip.x * width);
        const indexY = indexTip.y * height;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(209, 255, 38, 0.45)';
        ctx.lineWidth = 1;
        ctx.arc(indexX, indexY, 15, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(indexX - 20, indexY);
        ctx.lineTo(indexX + 20, indexY);
        ctx.moveTo(indexX, indexY - 20);
        ctx.lineTo(indexX, indexY + 20);
        ctx.stroke();
      }

      // Draw Gesture Label Tag next to Wrist
      const wristNode = landmarks[0];
      if (wristNode && activeGesture !== 'None') {
        const wristX = width - (wristNode.x * width);
        const wristY = wristNode.y * height - 20;

        ctx.fillStyle = '#0A0A0A'; // Deep artistic black background
        ctx.strokeStyle = '#D1FF26'; // Lime border accent
        ctx.lineWidth = 1.5;

        const labelText = activeGesture.toUpperCase();
        ctx.font = 'bold 11px monospace';
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const rectWidth = textWidth + 24;
        const rectHeight = 22;

        const rectX = wristX - rectWidth / 2;
        const rectY = wristY - rectHeight - 10;

        // Draw pill card background for gesture HUD
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 2); // Squared corners for tech-art look
        ctx.fill();
        ctx.stroke();

        // Draw gesture name text
        ctx.fillStyle = '#D1FF26';
        ctx.fillText(labelText, rectX + 12, rectY + 15);
      }
    });
    }

    // Draw manual bounding box if supplied
    if (boundingBox) {
      const boxX = width - (boundingBox.x * width) - (boundingBox.width * width);
      const boxY = boundingBox.y * height;
      const boxW = boundingBox.width * width;
      const boxH = boundingBox.height * height;

      ctx.strokeStyle = 'rgba(209, 255, 38, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]); // Dashed boundaries for scan design
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.setLineDash([]); // Reset
    }

  }, [landmarksList, activeGesture, boundingBox]);

  return (
    <canvas
      id="hand-tracking-overlay"
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
    />
  );
}
