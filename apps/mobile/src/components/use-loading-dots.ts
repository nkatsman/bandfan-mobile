import { useEffect, useState } from 'react';

export function formatLoadingText(baseText: string, dotCount: number) {
  const dots = Array.from({ length: dotCount }, () => '.').join(' ');

  return dots ? `${baseText} ${dots}` : baseText;
}

export function useLoadingDots(active: boolean) {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setDotCount(0);
      return undefined;
    }

    const interval = setInterval(() => {
      setDotCount((current) => (current >= 3 ? 0 : current + 1));
    }, 420);

    return () => clearInterval(interval);
  }, [active]);

  return dotCount;
}
