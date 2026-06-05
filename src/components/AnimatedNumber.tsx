import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: (value: number) => string;
  duration?: number;
}

export default function AnimatedNumber({
  value,
  className = '',
  format = (next) => Math.round(next).toLocaleString(),
  duration = 0.55,
}: AnimatedNumberProps) {
  const shouldReduceMotion = useReducedMotion();
  const previousValue = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (shouldReduceMotion) {
      previousValue.current = value;
      setDisplayValue(value);
      return;
    }

    const controls = animate(previousValue.current, value, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: setDisplayValue,
      onComplete: () => {
        previousValue.current = value;
      },
    });

    return () => controls.stop();
  }, [duration, shouldReduceMotion, value]);

  return <span className={className}>{format(displayValue)}</span>;
}
