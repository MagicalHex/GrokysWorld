// Talking/TalkingUI.jsx
import React, { useState } from 'react';
import { OBJECTS } from '../Objects';
import './TalkingUI.css'; // Import CSS

export const TalkingUI = ({ message, choices, icon = 'Hammer' }) => {
  return (
    <div className="chat-bubble">
      <div style={{ fontSize: '40px' }}>{icon}</div>

      {/* Greeting / Message */}
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

      {/* Choices */}
      {choices && (
        <div className="chat-bubble__choices">
          {choices.slice(0, 3).map((c, i) => {
            const icons = ['Up', 'Left', 'Right'];
            const item = c.item;

            const costText = item
              ? Object.entries(item.cost)
                  .map(([res, amt]) => `${amt} ${res}`)
                  .join(', ')
              : '';

            return (
              <div key={i} className="chat-bubble__choice">
                {/* Item Image */}
                {item && (
                  <ItemImage
                    src={`/${item.image}`}
                    alt={item.name}
                    item={item}
                  />
                )}

                {/* Text Block */}
                <div style={{ flex: 1 }}>
                  <div className="chat-bubble__choice-text">
                    <span className="chat-bubble__icon">[{icons[i]}]</span>
                    <span>{item ? `Buy ${item.name}` : c.text}</span>
                  </div>

                  {/* Description */}
                  {item && item.description && (
                    <div className="chat-bubble__description">
                      {item.description}
                    </div>
                  )}

                  {/* Cost */}
                  {item && costText && (
                    <div className="chat-bubble__cost">
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
        className="chat-bubble__item-fallback"
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
      className="chat-bubble__item-image"
      onError={() => setFailed(true)}
    />
  );
};