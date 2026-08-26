import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'gradient' | 'quiet';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Quiet buttons that sit inline in a row rather than spanning the column. */
  inline?: boolean;
}

export function Button({ variant = 'primary', inline, className, ...props }: ButtonProps) {
  const classes = [
    variant === 'quiet' ? styles.quiet : styles.button,
    variant === 'primary' ? styles.primary : '',
    variant === 'gradient' ? styles.gradient : '',
    inline ? styles.inline : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return <button type="button" className={classes} {...props} />;
}
