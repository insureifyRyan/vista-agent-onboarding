import { describe, expect, it } from 'vitest';
import {
  backspace,
  codeToString,
  emptyCode,
  isCodeComplete,
  paste,
  setDigit,
  writeFrom,
} from '@/components/ui/codeInputState';

const from = (text: string) => text.split('');

describe('typing', () => {
  it('advances one box at a time', () => {
    let digits = emptyCode();
    for (const [index, digit] of [...'123456'].entries()) {
      const result = writeFrom(digits, index, digit);
      digits = result.digits;
      expect(result.cursor).toBe(index + 1);
    }
    expect(codeToString(digits)).toBe('123456');
    expect(isCodeComplete(digits)).toBe(true);
  });

  it('ignores non-digits', () => {
    expect(codeToString(writeFrom(emptyCode(), 0, 'a').digits)).toBe('');
    expect(codeToString(writeFrom(emptyCode(), 0, '1a2').digits)).toBe('12');
  });

  it('does not overflow past the last box', () => {
    const { digits, cursor } = writeFrom(emptyCode(), 4, '999999');
    expect(codeToString(digits)).toBe('99');
    expect(cursor).toBe(6);
  });
});

describe('clearing a middle box', () => {
  it('leaves the later digits where they are', () => {
    // The bug this guards: joining a string would collapse the gap and shift
    // 4, 5 and 6 one place left, silently corrupting the code.
    const cleared = setDigit(from('123456'), 2, '');
    expect(cleared).toEqual(['1', '2', '', '4', '5', '6']);
    expect(isCodeComplete(cleared)).toBe(false);
  });
});

describe('backspace', () => {
  it('steps back and clears the previous box when this one is empty', () => {
    const result = backspace(['1', '2', '', '', '', ''], 2);
    expect(result).toEqual({ digits: ['1', '', '', '', '', ''], focus: 1 });
  });

  it('leaves a filled box to the browser', () => {
    expect(backspace(from('123456'), 3)).toBeNull();
  });

  it('does nothing at the first box', () => {
    expect(backspace(emptyCode(), 0)).toBeNull();
  });

  it('walks back across a cleared middle box without shifting digits', () => {
    const cleared = setDigit(from('123456'), 2, '');
    const stepped = backspace(cleared, 2);
    expect(stepped?.digits).toEqual(['1', '', '', '4', '5', '6']);
    expect(stepped?.focus).toBe(1);
  });
});

describe('paste', () => {
  it('fills all six boxes from a pasted code', () => {
    const result = paste(emptyCode(), 0, '482913');
    expect(codeToString(result!.digits)).toBe('482913');
    expect(result!.cursor).toBe(6);
  });

  it('strips the formatting people paste out of an email', () => {
    expect(codeToString(paste(emptyCode(), 0, ' 482-913 ')!.digits)).toBe('482913');
  });

  it('fills from the first box even when dropped on a later one', () => {
    const result = paste(emptyCode(), 3, '482913');
    expect(codeToString(result!.digits)).toBe('482913');
  });

  it('fills from the current box for a partial paste', () => {
    const result = paste(emptyCode(), 2, '99');
    expect(result!.digits).toEqual(['', '', '9', '9', '', '']);
  });

  it('ignores a paste with no digits in it', () => {
    expect(paste(emptyCode(), 0, 'hello')).toBeNull();
  });
});
