// AOEEffect.jsx
import React, { useRef, useEffect } from 'react';

export const AreaOfEffectPlayer = ({ trigger, onFinish }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!trigger) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let radius = 10;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (frame < 40) {
        radius += 20;
        frame++;

        const alpha = 1 - frame / 40;
        ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
        ctx.lineWidth = 12;
        ctx.shadowBlur = 50;
        ctx.shadowColor = '#ff5500';
        ctx.beginPath();
        ctx.arc(75, 75, radius, 0, Math.PI * 2); // centered in 150x150 canvas
        ctx.stroke();

        requestAnimationFrame(animate);
      } else {
        onFinish?.();
      }
    };

    canvas.width = 150;
    canvas.height = 150;
    animate();
  }, [trigger, onFinish]);

  return trigger ? (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '300px',
        height: '300px',
        marginLeft: '-75px',
        marginTop: '-75px',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  ) : null;
};

export default AreaOfEffectPlayer; // ← default export!