// Talking/TalkingUI.jsx
import React from 'react';

export const TalkingUI = ({ message, choices }) => {
  return (
    <div className="chat-bubble">
      <div style={{ fontSize: '40px' }}>⚒️</div>
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
      {choices && (
        <div className="chat-bubble__choices">
          {choices.slice(0, 3).map((c, i) => {
            const icons = ['Up', 'Left', 'Right'];
            return (
              <div key={i} className="chat-bubble__choice">
                <span className="chat-bubble__icon">[{icons[i]}]</span>
                {c.text}
              </div>
            );
          })}
        </div>
      )}
      <div className="chat-bubble__hint">Press Down to walk away</div>
    </div>
  );
};