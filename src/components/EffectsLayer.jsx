// EffectsLayer.jsx — Final perfect centering + expanding orange ring
import React, { useRef, useEffect } from 'react';

const EffectsLayer = ({
  playerPos,
  tileSize,
  worldToScreen,
  fireballCastTrigger,
}) => {
  const canvasRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!fireballCastTrigger) return;
    const center = worldToScreen(playerPos.x, playerPos.y);
    if (!center) return;

    ringRef.current = { x: center.x, y: center.y, radius: 10, frame: 0 };
  }, [fireballCastTrigger, playerPos, worldToScreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let id;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (ringRef.current) {
        const r = ringRef.current;
        r.radius += 20;
        r.frame++;

        if (r.frame < 40) {
          ctx.strokeStyle = `rgba(255, 80, 0, ${1 - r.frame / 40})`;
          ctx.lineWidth = 15;
          ctx.shadowBlur = 60;
          ctx.shadowColor = '#ff4400';
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ringRef.current = null;
        }
      }

      id = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', resize);
    };
  }, [playerPos, tileSize, worldToScreen, fireballCastTrigger]);

  return (
    <div className="effects-layer-anchor">
      <canvas ref={canvasRef} className="effects-layer" style={{ display: 'block' }} />
    </div>
  );
};

export default EffectsLayer;