// Talking/TalkingUI.jsx
import React, { useState } from 'react';
import { OBJECTS } from '../Objects';

export const TalkingUI = ({ message, choices, icon = 'Hammer' }) => {
  return (
    <div className="chat-bubble">
      <div style={{ fontSize: '40px' }}>{icon}</div>

      {/* Only show greeting / say messages */}
      {message && !choices?.[0]?.item && (
        <div className="chat-bubble__message">
          {message.split('\n').map((line, i) => {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            return (
              <div key={i}>
                {parts.map((part, idx) =>
                  idx % 2 === 1 ? (
                    <strong key={idx}>{part}</strong>
                  ) : (
                    <React.Fragment key={idx}>{part}</React.Fragment>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {choices && (
        <div className="chat-bubble__choices">
          {choices.slice(0, 3).map((c, i) => {
            const icons = ['Up', 'Left', 'Right'];
            const item = c.item;

            // Build cost string
            const costText = item
              ? Object.entries(item.cost)
                  .map(([res, amt]) => `${amt} ${res}`)
                  .join(', ')
              : '';

            return (
              <div
                key={i}
                className="chat-bubble__choice"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  lineHeight: '1.4',
                }}
              >
                {/* Image / Emoji */}
                {item && (
                  <ItemImage
                    src={`/${item.image}`}
                    alt={item.name}
                    item={item}
                  />
                )}

                {/* Arrow + Text Block */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="chat-bubble__icon">[{icons[i]}]</span>
                    <span>
                      {item ? `Buy ${item.name}` : c.text}
                    </span>
                  </div>

                  {/* Cost on second line, indented */}
                  {item && costText && (
                    <div
                      style={{
                        marginLeft: '28px', // align with text above
                        fontSize: '0.9em',
                        color: '#888',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {costText}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="chat-bubble__hint">Press Down to walk away</div>
    </div>
  );
};

/* --------------------------------------------------------------- */
const ItemImage = ({ src, alt, item }) => {
  const [failed, setFailed] = useState(false);

  const fallbackEmoji = item?.addsToInventory
    ? OBJECTS[item.addsToInventory] || 'Unknown'
    : 'Unknown';

  if (failed) {
    return (
      <span
        style={{
          fontSize: '36px',
          minWidth: '48px',
          textAlign: 'center',
          display: 'inline-block',
        }}
        title={item.name}
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: '48px',
        height: '48px',
        objectFit: 'contain',
        borderRadius: '4px',
        imageRendering: '-webkit-optimize-contrast',
      }}
      onError={() => setFailed(true)}
    />
  );
};