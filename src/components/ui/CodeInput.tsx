'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import {
  backspace,
  digitsOnly,
  normalise,
  paste,
  setDigit,
  writeFrom,
  type CodeDigits,
} from './codeInputState';
import styles from './CodeInput.module.css';

export {
  CODE_LENGTH,
  codeToString,
  emptyCode,
  isCodeComplete,
  type CodeDigits,
} from './codeInputState';

interface CodeInputProps {
  length?: number;
  value: CodeDigits;
  onChange: (value: CodeDigits) => void;
  error?: string | null;
  disabled?: boolean;
}

export function CodeInput({ length = 6, value, onChange, error, disabled }: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const characters = normalise(value, length);

  const focusBox = (index: number) => {
    refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  };

  const handleInput = (index: number, raw: string) => {
    const incoming = digitsOnly(raw);
    if (!incoming) {
      onChange(setDigit(characters, index, ''));
      return;
    }
    // A phone keyboard, or an autofilled one-time code, can arrive several
    // characters at a time.
    const { digits, cursor } = writeFrom(characters, index, incoming);
    onChange(digits);
    focusBox(incoming.length > 1 ? cursor : index + 1);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      // Only intercept on an empty box; on a filled one the browser's own
      // delete is exactly right.
      const stepped = backspace(characters, index);
      if (stepped) {
        event.preventDefault();
        onChange(stepped.digits);
        focusBox(stepped.focus);
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    const result = paste(characters, index, event.clipboardData.getData('text'));
    if (!result) return;
    event.preventDefault();
    onChange(result.digits);
    focusBox(result.cursor - 1);
  };

  return (
    <div className={styles.wrap}>
      <div className={`${styles.boxes} ${error ? styles.invalid : ''}`}>
        {characters.map((char, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node;
            }}
            className={styles.box}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={char}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={error ? 'true' : undefined}
            onChange={(event) => handleInput(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={(event) => event.target.select()}
          />
        ))}
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
