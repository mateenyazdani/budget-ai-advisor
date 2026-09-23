import { useEffect, useRef, useState } from 'react';

// Fades a section in as it enters view instead of showing everything on
// load — the difference between a static page and one that feels alive as
// you scroll it. Pure IntersectionObserver, no animation library, and it
// gets out of the way entirely for anyone who has asked their system to
// reduce motion.
export function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}
