// src/components/HealthRegenSystem.jsx
import React, { useEffect, useRef } from 'react';
import { subscribe } from '../utils/gameLoop';

const REGEN_DELAY = 7000;
const REGEN_INTERVAL = 2000;
const HEAL_AMOUNT = 1;

export default function HealthRegenSystem({
  playerHealth,
  onPlayerHealthChange,
  isDead,
  onHealPopup,
  playerPos,
  lastDamageTime,   // ← LIVE FROM useGameState
}) {
  const refs = useRef({
    playerHealth,
    isDead,
    onPlayerHealthChange,
    onHealPopup,
    playerPos,
    lastDamageTime
  });

  useEffect(() => {
    refs.current = {
      playerHealth,
      isDead,
      onPlayerHealthChange,
      onHealPopup,
      playerPos,
      lastDamageTime
    };
  }, [playerHealth, isDead, onPlayerHealthChange, onHealPopup, playerPos, lastDamageTime]);
useEffect(() => {
  console.log('[REGEN EFFECT] Subscribed with lastDamageTime:', lastDamageTime);
}, [lastDamageTime]);
  useEffect(() => {
    let lastRegenTime = 0;

    const unsubscribe = subscribe((delta, time) => {
      const { playerHealth, isDead, onPlayerHealthChange, onHealPopup, playerPos, lastDamageTime } = refs.current;

      if (isDead || playerHealth >= 100 || playerHealth <= 0) return;
      if (time - lastDamageTime < REGEN_DELAY) return;
      if (time - lastRegenTime < REGEN_INTERVAL) return;

      lastRegenTime = time;
      console.log('[REGEN] +1 HP →', playerHealth + 1, '| Time since damage:', (time - lastDamageTime)/1000, 'sec');
      onPlayerHealthChange(playerHealth + HEAL_AMOUNT);
      onHealPopup?.(playerPos.x, playerPos.y);
    });

    return unsubscribe;
  }, [lastDamageTime]); // This triggers resubscribe when damage taken

  return null;
}