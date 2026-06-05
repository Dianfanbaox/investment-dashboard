import { useState, useCallback } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  onSuccess?: () => void | Promise<void>;
  children: React.ReactNode;
  useLoading?: boolean;
}

export function Button({
  variant = 'primary',
  loading = false,
  onSuccess,
  children,
  className,
  onClick,
  disabled,
  useLoading = true,
  ...props
}: ButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');

  const isLoading = loading || state === 'loading';
  const isSuccess = state === 'success';

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading || isSuccess || disabled) return;

    if (onClick) {
      onClick(e);
    }

    if (onSuccess) {
      if (useLoading) setState('loading');
      try {
        await onSuccess();
        setState('success');
        setTimeout(() => setState('idle'), 1500);
      } catch {
        setState('idle');
      }
    }
  }, [onClick, onSuccess, isLoading, isSuccess, disabled, useLoading]);

  return (
    <button
      className={clsx(
        variant === 'primary' ? 'btn-primary' : 'btn-secondary',
        isLoading && 'btn-loading',
        isSuccess && 'btn-success',
        className
      )}
      onClick={handleClick}
      disabled={isLoading || isSuccess || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="btn-spinner" />
      ) : isSuccess ? (
        <span className="btn-check">✓</span>
      ) : (
        children
      )}
    </button>
  );
}
