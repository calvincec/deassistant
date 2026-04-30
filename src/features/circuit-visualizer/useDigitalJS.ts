import { useEffect, useState, type RefObject } from 'react';
import type { DigitalJSNetlist } from './types';
import type { UseDigitalJSResult } from './types';

// Shared loader to avoid importing jQuery / jquery-ui / digitaljs multiple times
let digitaljsLoader: Promise<any> | null = null;
async function loadDigitalResources() {
  if (digitaljsLoader) return digitaljsLoader;

  digitaljsLoader = (async () => {
    const $module = await import('jquery');
    const $ = ($module && ($module.default ?? $module));

    try {
      // expose globals required by DigitalJS
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).$ = $;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).jQuery = $;
    } catch (e) {
      // ignore
    }

    // Ensure jquery-ui/widget is loaded (may be provided by different packages)
    try {
      await import('jquery-ui/ui/widget');
    } catch (e) {
      try {
        await import('jquery-ui');
      } catch (err) {
        // ignore — widget may already be available
      }
    }

    const djModule = await import('digitaljs');
    return djModule;
  })();

  return digitaljsLoader;
}

export function useDigitalJS(
  containerRef: RefObject<HTMLDivElement | null>,
  netlist: DigitalJSNetlist | null,
): UseDigitalJSResult {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !netlist) {
      setStatus('idle');
      setError(null);
      if (container) {
        container.replaceChildren();
      }
      return undefined;
    }

    let cancelled = false;
    setStatus('loading');
    setError(null);
    container.replaceChildren();

    let circuit: any | null = null;
    let paper: any | null = null;

    (async () => {
      try {
        const djModule = await loadDigitalResources();
        const Circuit = (djModule as any).Circuit;

        circuit = new Circuit(netlist);
        paper = circuit.displayOn(container);
        circuit.start();

        requestAnimationFrame(() => {
          if (!cancelled) setStatus('ready');
        });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Failed to render the circuit.';
        setError(message);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      paper?.remove();
      circuit?.shutdown();
      container.replaceChildren();
    };
  }, [containerRef, netlist]);

  return {
    status,
    error,
  };
}