// MonsterLayer.jsx
import React, { memo, useMemo } from 'react';
import Monster from './Monster';
import { useIsoProjection } from '../hooks/useIsoProjection';
import { isMonster } from '../utils/monsterRegistry';

const MonsterLayer = memo(({
  objects,
  globalMonsterHealths,
  monsterData,
  monsterTypes,
  tileSize,
  camera,  // ← use camera.x/y for offset
}) => {
  const { worldToScreen } = useIsoProjection(tileSize);

  // 🔥 KEY: Compute camera offset (same as CanvasGrid)
  const camScreen = useMemo(() => worldToScreen(camera.x, camera.y), [camera.x, camera.y, worldToScreen]);

  // Filter monsters
  const monsters = useMemo(() => 
    Object.entries(objects)
      .map(([key, objData]) => {
        const [xStr, yStr] = key.split(',');
        const x = Number(xStr);
        const y = Number(yStr);

        const rawType = typeof objData === 'string' ? objData : objData.type;
        const objType = monsterTypes[rawType] || rawType;

        if (!isMonster(objType)) return null;

        const monsterId = typeof objData === 'string' ? objData : objData.id || objData;
        const data = monsterData[objType];
        const maxHp = data?.hp || 100;
        const currentHp = globalMonsterHealths[monsterId] ?? maxHp;
        const monsterName = data?.name || objType.toUpperCase();

        // 🔥 FINAL SCREEN POSITION (same math as CanvasGrid)
        const baseScreen = worldToScreen(x, y);
        const screenX = baseScreen.x - camScreen.x;  // relative to camera
        const screenY = baseScreen.y - camScreen.y;

        return {
          monsterId,
          screenX,
          screenY,
          currentHp,
          maxHp,
          monsterName,
          imageSrc: data?.image,
        };
      })
      .filter(Boolean),
    [objects, globalMonsterHealths, monsterData, monsterTypes, worldToScreen, camScreen]
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',    // ← screen center (like PlayerLayer)
        top: '50%',     // ← screen center
        width: '0',     // ← no size needed
        height: '0',    // ← no size needed
        pointerEvents: 'none',
        zIndex: 15,
        transform: 'translate(-50%, -50%)',  // ← center origin
      }}
    >
      {monsters.map((monster) => (
        <Monster
          key={monster.monsterId}
          screenX={monster.screenX}
          screenY={monster.screenY}
          currentHp={monster.currentHp}
          maxHp={monster.maxHp}
          monsterName={monster.monsterName}
          tileSize={tileSize}
          imageSrc={monster.imageSrc}
        />
      ))}
    </div>
  );
});

export default MonsterLayer;