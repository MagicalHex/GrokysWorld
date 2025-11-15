// FlatEntityLayer.jsx — Renders EVERYTHING flat
import React from 'react';
import PlayerLayer from './PlayerLayer';
import MonsterLayer from './MonsterLayer';

const FlatEntityLayer = ({
  playerPos, moveDirectionRef, moveTrigger, globalPlayerHealth, currentAction, 
  choppingProgress, tileSize, popups, addPopup, setPopups, pickupPopups, 
  removePickupPopup, objects, globalMonsterHealths, monsterData, monsterTypes, 
  camera, worldToScreen // from useIsoProjection
}) => {
  return (
    <>
      {/* 🔥 PLAYER — Direct child of ZIndexManager */}
      <PlayerLayer
        className="player-layer"
        playerPos={playerPos}
        moveDirectionRef={moveDirectionRef}
        moveTrigger={moveTrigger}
        globalPlayerHealth={globalPlayerHealth}
        currentAction={currentAction}
        choppingProgress={choppingProgress}
        tileSize={tileSize}
        popups={popups.filter(p => p.isPlayer)}
        addPopup={addPopup}
        setPopups={setPopups}
        pickupPopups={pickupPopups}
        removePickupPopup={removePickupPopup}
      />

      {/* 🔥 MONSTERS — Direct siblings of Player */}
      <MonsterLayer
        objects={objects}
        globalMonsterHealths={globalMonsterHealths}
        monsterData={monsterData}
        monsterTypes={monsterTypes}
        tileSize={tileSize}
        camera={camera}
        popups={popups.filter(p => !p.isPlayer)}
        addPopup={addPopup}
        setPopups={setPopups}
        worldToScreen={worldToScreen} // Pass if needed for positioning
      />
    </>
  );
};

export default FlatEntityLayer;