import React, { useEffect, useRef } from 'react';
import './CooldownBar.css';

const DURATION = { melee: 1500, ranged: 5000 };

const CooldownBar = ({ signal, setCooldownSignal }) => {
  const { active, type } = signal || {};
  const fillRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!fillRef.current) return;

    // === ALWAYS RESET FILL ON SIGNAL CHANGE ===
    if (!active) {
      fillRef.current.style.width = '0%';
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      return;
    }

    const duration = DURATION[type] || 1500;
    let cycleStart = performance.now();

    const tick = () => {
      if (!active || !fillRef.current) return;

      const elapsed = performance.now() - cycleStart;
      let progress = (elapsed / duration) * 100;

      if (progress >= 100) {
        cycleStart = performance.now();
        progress = 0;
      }

      fillRef.current.style.width = `${Math.min(100, progress)}%`;
      rafRef.current = requestAnimationFrame(tick);
    };

    // Start from 0%
    fillRef.current.style.width = '0%';
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [active, type]);

  // === ALWAYS RENDER — just hide when inactive ===
  return (
    <div className={`cooldown-container ${active ? 'active' : 'inactive'}`}>
      <div className="cooldown-bar">
        <div ref={fillRef} className="cooldown-fill" />
      </div>
    </div>
  );
};

export default CooldownBar;