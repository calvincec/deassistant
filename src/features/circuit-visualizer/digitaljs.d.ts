import type { DigitalJSNetlist } from './types';

declare module 'digitaljs' {
  export interface DigitalJSPaper {
    once(event: 'render:done', handler: () => void): void;
    remove(): void;
  }

  export class Circuit {
    constructor(data: DigitalJSNetlist);
    displayOn(element: HTMLElement): DigitalJSPaper;
    start(): void;
    stop(options?: { synchronous?: boolean }): void;
    shutdown(): void;
  }
}