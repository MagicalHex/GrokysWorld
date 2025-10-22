import { useState, useEffect } from 'react';

export const useMonsterHealths = (objects) => {
  const [monsterHealths, setMonsterHealths] = useState({});

  useEffect(() => {
    const healths = {};
    Object.keys(objects).forEach(key => {
      if (objects[key] === 'skeleton') {
        healths[key] = 100;
      }
    });
    setMonsterHealths(healths);
  }, [objects]);

  return [monsterHealths, setMonsterHealths];
};