// EffectsLayer.jsx
import React, { memo, useRef, useEffect } from 'react';
import { useIsoProjection } from '../hooks/useIsoProjection';

const EffectsLayer = memo(({ 
  playerPos, 
  tileSize, 
  camera,
  fireballCastTrigger,     // ← NEW: number that changes when we cast fireball
  worldToScreen            // ← from parent (PlayMode)
}) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const lastCastRef = useRef(0);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctxRef.current = ctx;
  }, []);

  // TRIGGER: When fireball is cast → spawn epic explosion
  useEffect(() => {
    if (!fireballCastTrigger || fireballCastTrigger === lastCastRef.current) return;

    lastCastRef.current = fireballCastTrigger;

    const center = { x: playerPos.x, y: playerPos.y };
    const particles = [];

    // 80 fiery particles
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const life = 40 + Math.random() * 30;

      particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 3 + Math.random() * 5,
        hue: 15 + Math.random() * 40, // orange → yellow
      });
    }

    particlesRef.current = particles;
  }, [fireballCastTrigger, playerPos]);

  // ANIMATION LOOP — super lightweight
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      let hasActiveParticles = false;

      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.life--;
        const alpha = p.life / p.maxLife;

        if (p.life <= 0) return false;

        hasActiveParticles = true;

        const screen = worldToScreen(p.x, p.y);
        if (!screen) return true;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${p.hue}, 100%, ${60 + alpha * 30}%)`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff4400';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      // PULSING AOE CIRCLE (10 tiles)
      if (hasActiveParticles || frame < 30) {
        const pulse = Math.sin(frame * 0.2) * 0.3 + 0.7;
        const centerScreen = worldToScreen(playerPos.x, playerPos.y);

        ctx.strokeStyle = `rgba(255, 80, 0, ${pulse * 0.6})`;
        ctx.lineWidth = 6;
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ff2200';
        ctx.beginPath();
        ctx.arc(centerScreen.x, centerScreen.y, tileSize * 10 * 0.75, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow ring
        ctx.strokeStyle = `rgba(255, 180, 0, ${pulse * 0.4})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerScreen.x, centerScreen.y, tileSize * 10 * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }

      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [worldToScreen, playerPos, tileSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '85vh',
        pointerEvents: 'none',
        zIndex: 99999, // ABOVE EVERYTHING
      }}
    />
  );
});

export default EffectsLayer;