import { useEffect, useState, type RefObject } from 'react';
import type { DigitalJSNetlist } from './types';
import type { DigitalJSPaper, UseDigitalJSResult } from './types';

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
    let paper: DigitalJSPaper | null = null;

    (async () => {
      try {
        // Load jQuery first and expose globals required by DigitalJS,
        // then import DigitalJS so it sees the global jQuery during module evaluation.
        const $module = await import('jquery');
        const $ = ($module && ($module.default ?? $module));
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).$ = $;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).jQuery = $;
        } catch (e) {
          // ignore
        }

        // Load jquery-ui's widget factory so `$.widget` is available.
        try {
          // Some packaging setups expose jquery-ui modules under this path
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          await import('jquery-ui/ui/widget');
        } catch (e) {
          // If that fails, try the legacy package name
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            await import('jquery-ui');
          } catch (err) {
            // ignore — jquery-ui may already be loaded by digitaljs or unavailable
          }
        }

        const djModule = await import('digitaljs');
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