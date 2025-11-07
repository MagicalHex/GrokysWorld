// src/hooks/useEquipment.jsx
import { useMemo } from 'react';
import { splitInventory } from '../splitInventory';

export const useEquipment = (rawInventory) => {
  return useMemo(() => {
    const { equipment, inventory } = splitInventory(rawInventory);
    return { equipment, inventory };
  }, [rawInventory]);
};