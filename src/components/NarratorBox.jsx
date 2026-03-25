import { useEffect, useRef, useState } from 'react';
import styles from './components.module.css';

/**
 * TypewriterLine — Renders a single message with a typewriter animation.
 */
function TypewriterLine({ text, speed = 30, onComplete }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');

    function tick() {
      if (indexRef.current < text.length) {
        indexRef.current++;
        setDisplayed(text.slice(0, indexRef.current));
        timeoutRef.current = setTimeout(tick, speed);
      } else {
        onComplete?.();
      }
    }
    timeoutRef.current = setTimeout(tick, speed);
    return () => clearTimeout(timeoutRef.current);
  }, [text, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span>{displayed}</span>;
}

/**
 * NarratorBox — Scrolling narrative feed with typewriter effect on newest entry.
 *
 * @param {object} props
 * @param {Array<{text: string, timestamp?: number, id: string|number}>} props.messages
 * @param {number} [props.typewriterSpeed=25] - ms per character
 * @param {string} [props.className]
 */
export function NarratorBox({ messages = [], typewriterSpeed = 25, className = '' }) {
  const scrollRef = useRef(null);
  const prevLenRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length !== prevLenRef.current) {
      prevLenRef.current = messages.length;
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages]);

  const lastIndex = messages.length - 1;

  return (
    <div
      ref={scrollRef}
      className={`${styles.narratorBox} ${className}`}
      aria-live="polite"
      aria-label="Narrator feed"
    >
      {messages.length === 0 && (
        <p className={styles.narratorEmpty}>Awaiting events…</p>
      )}
      {messages.map((msg, i) => (
        <div
          key={msg.id ?? i}
          className={`${styles.narratorLine} ${i === lastIndex ? styles.narratorLineNew : styles.narratorLineOld}`}
        >
          {msg.timestamp && (
            <span className={styles.narratorTimestamp}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          {i === lastIndex ? (
            <TypewriterLine text={msg.text} speed={typewriterSpeed} />
          ) : (
            <span>{msg.text}</span>
          )}
        </div>
      ))}
    </div>
  );
}
