// src/components/HealthRegenSystem.jsx
import React, { useEffect, useRef } from 'react';
import { subscribe } from '../utils/gameLoop';

const REGEN_DELAY = 7000;
const REGEN_INTERVAL = 7000;
const HEAL_AMOUNT = 7;

// HealthRegenSystem.jsx
export default function HealthRegenSystem({
  playerHealth,
  onPlayerHealthChange,
  isDead,
  onHealPopup,
  playerPos,
  lastDamageTime,
}) {
  const refs = useRef({
    playerHealth,
    isDead,
    onPlayerHealthChange,
    onHealPopup,
    playerPos,
    lastDamageTime, // THIS IS NOT USED. IT IS COMMENTED OUT IN useGameState
  });

  // Update refs on every render
  useEffect(() => {
    refs.current.playerHealth = playerHealth;
    refs.current.isDead = isDead;
    refs.current.onPlayerHealthChange = onPlayerHealthChange;
    refs.current.onHealPopup = onHealPopup;
    refs.current.playerPos = playerPos;
    refs.current.lastDamageTime = lastDamageTime;  // ← ALWAYS FRESH
  }, [playerHealth, isDead, onPlayerHealthChange, onHealPopup, playerPos, lastDamageTime]);

  // SUBSCRIBE ONLY ONCE
  useEffect(() => {
    let lastRegenTime = 0;

    const unsubscribe = subscribe((delta, time) => {
      const { playerHealth, isDead, onPlayerHealthChange, onHealPopup, playerPos, lastDamageTime } = refs.current;

      // Early exit
      if (isDead || playerHealth >= 100 || playerHealth <= 0) return;

      const timeSinceDamage = time - lastDamageTime;
      if (timeSinceDamage < REGEN_DELAY) {
        // Optional: reset regen timer on new damage
        // lastRegenTime = time;
        return;
      }

      if (time - lastRegenTime < REGEN_INTERVAL) return;

      lastRegenTime = time;
      console.log('[REGEN] +1 HP →', playerHealth + 1, '| Since damage:', timeSinceDamage / 1000, 's');
      onPlayerHealthChange(playerHealth + HEAL_AMOUNT);
      onHealPopup?.(playerPos.x, playerPos.y, HEAL_AMOUNT);
    });

    return unsubscribe;
  }, []); // ← NEVER RESUBSCRIBE

  return null;
}