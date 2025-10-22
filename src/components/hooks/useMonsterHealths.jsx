import { useState, useEffect } from 'react';

export const useMonsterHealths = (objects) => {
  const [monsterHealths, setMonsterHealths] = useState({});

  useEffect(() => {
    setMonsterHealths(prev => {
      const newHealths = { ...prev }; // KEEP EXISTING HEALTH!
      
      // ONLY NEW MONSTERS GET 100 HP
      Object.keys(objects).forEach(key => {
        if ((objects[key] === 'skeleton' || objects[key] === 'spider') && !(key in newHealths)) {
          newHealths[key] = 100;
        }
      });
      
      // REMOVE DEAD (already removed from objects)
      Object.keys(newHealths).forEach(key => {
        if (!objects[key]) delete newHealths[key];
      });
      
      return newHealths; // NEVER RESET EXISTING!
    });
  }, [objects]);

  return [monsterHealths, setMonsterHealths];
};