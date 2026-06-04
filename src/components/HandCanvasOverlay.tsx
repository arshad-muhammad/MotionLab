/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { Landmark } from '../types';

interface HandCanvasOverlayProps {
  leftHandLandmarks: Landmark[] | null;
  rightHandLandmarks: Landmark[] | null;
  recognizedLabel: string | null;
  recognizedConfidence: number | null;
  recognizedHand: 'left' | 'right' | 'both' | null;
}

export default function HandCanvasOverlay({
  leftHandLandmarks,
  rightHandLandmarks,
  recognizedLabel,
  recognizedConfidence,
  recognizedHand
}: HandCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Connection lines mapping for hand skeletal structures: [from joint, to joint]
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
    // Knuckle arch
    [5, 9], [9, 13], [13, 17],
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    const drawHandMesh = (landmarks: Landmark[], side: 'left' | 'right') => {
      if (!landmarks || landmarks.length < 21) return;

      // Color scheme setting: Neon Lime for Right hand, bright electric cyan for Left hand
      const strokeColor = side === 'right' ? '#D1FF26' : '#22D3EE';
      const shadowColor = side === 'right' ? 'rgba(209, 255, 38, 0.6)' : 'rgba(34, 211, 238, 0.6)';

      // 1. Draw Skeleton Lines
      ctx.beginPath();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = strokeColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = shadowColor;

      skeletonConnections.forEach(([fIdx, tIdx]) => {
        const from = landmarks[fIdx];
        const to = landmarks[tIdx];

        // Mirror horizontal drawing offset
        const xStart = w - (from.x * w);
        const yStart = from.y * h;
        const xEnd = w - (to.x * w);
        const yEnd = to.y * h;

        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
      });
      ctx.stroke();

      // Reset shadows for solid landmark node fills
      ctx.shadowBlur = 0;

      // 2. Draw Joints and Knuckles
      landmarks.forEach((pt, idx) => {
        const cx = w - (pt.x * w);
        const cy = pt.y * h;

        ctx.beginPath();
        if (idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20) {
          // Finger Tips: White node core, neon outline
          ctx.arc(cx, cy, 6.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2.5;
        } else if (idx === 0) {
          // Wrist: Accentuated larger node
          ctx.arc(cx, cy, 8.5, 0, 2 * Math.PI);
          ctx.fillStyle = strokeColor;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
        } else {
          // Default joints
          ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
          ctx.fillStyle = side === 'right' ? 'rgba(209, 255, 38, 0.8)' : 'rgba(34, 211, 238, 0.8)';
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.lineWidth = 1;
        }
        ctx.fill();
        ctx.stroke();
      });

      // 3. Draw Target Marker on the Index Tip with side info
      const indexTip = landmarks[8];
      const wrist = landmarks[0];
      if (indexTip && wrist) {
        const indexX = w - (indexTip.x * w);
        const indexY = indexTip.y * h;

        ctx.beginPath();
        ctx.strokeStyle = side === 'right' ? 'rgba(209, 255, 38, 0.4)' : 'rgba(34, 211, 238, 0.4)';
        ctx.lineWidth = 1;
        ctx.arc(indexX, indexY, 18, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(indexX - 24, indexY);
        ctx.lineTo(indexX + 24, indexY);
        ctx.moveTo(indexX, indexY - 24);
        ctx.lineTo(indexX, indexY + 24);
        ctx.stroke();

        // Print Side label text next to Wrist bone
        const wristX = w - (wrist.x * w);
        const wristY = wrist.y * h + 24;

        ctx.fillStyle = side === 'right' ? '#D1FF26' : '#22D3EE';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(side === 'right' ? 'RIGHT_HAND' : 'LEFT_HAND', wristX, wristY);
      }
    };

    // Draw Right and Left hands if present
    if (leftHandLandmarks) {
      drawHandMesh(leftHandLandmarks, 'left');
    }
    if (rightHandLandmarks) {
      drawHandMesh(rightHandLandmarks, 'right');
    }

    // Draw HUD text box on upper center of camera panel for live classification feedback
    if (recognizedLabel && recognizedConfidence !== null) {
      ctx.textAlign = 'center';
      
      const textX = w / 2;
      const textY = 45;

      // Draw elegant indicator card
      const signText = `${recognizedLabel.toUpperCase()} (${recognizedConfidence}%)`;
      ctx.font = 'black italic italic 15px sans-serif font-sans';
      ctx.font = 'bold 13px monospace';
      const measure = ctx.measureText(signText);
      const cardW = measure.width + 36;
      const cardH = 30;

      ctx.fillStyle = 'rgba(5, 5, 5, 0.9)';
      ctx.strokeStyle = '#D1FF26';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(textX - cardW / 2, textY - cardH / 2, cardW, cardH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#D1FF26';
      ctx.fillText(signText, textX, textY + 4);
    }

  }, [leftHandLandmarks, rightHandLandmarks, recognizedLabel, recognizedConfidence, recognizedHand]);

  return (
    <canvas
      id="sign-skeleton-overlay"
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
    />
  );
}
