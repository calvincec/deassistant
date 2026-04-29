export interface DigitalJSPoint {
  x: number;
  y: number;
}

export interface DigitalJSConnectorEndpoint {
  id: string;
  port: string;
}

export interface DigitalJSConnector {
  from: DigitalJSConnectorEndpoint;
  to: DigitalJSConnectorEndpoint;
  name?: string;
  vertices?: DigitalJSPoint[];
  source_positions?: DigitalJSPoint[];
}

export interface DigitalJSInputDevice {
  type: 'Input';
  bits?: 1;
  label: string;
  net: string;
}

export interface DigitalJSOutputDevice {
  type: 'Output';
  bits?: 1;
  label: string;
  net: string;
}

export interface DigitalJSUnaryGateDevice {
  type: 'Not';
  bits?: 1;
  label?: string;
}

export interface DigitalJSBinaryGateDevice {
  type: 'And' | 'Or';
  bits?: 1;
  inputs: number;
  label?: string;
}

export interface DigitalJSConstantDevice {
  type: 'Constant';
  bits?: 1;
  constant: string;
  label?: string;
}

export type DigitalJSDevice =
  | DigitalJSInputDevice
  | DigitalJSOutputDevice
  | DigitalJSUnaryGateDevice
  | DigitalJSBinaryGateDevice
  | DigitalJSConstantDevice;

export interface DigitalJSNetlist {
  devices: Record<string, DigitalJSDevice>;
  connectors: DigitalJSConnector[];
  subcircuits: Record<string, DigitalJSNetlist>;
}

export type ExpressionNode =
  | { kind: 'variable'; name: string }
  | { kind: 'constant'; value: 0 | 1 }
  | { kind: 'not'; child: ExpressionNode }
  | { kind: 'and'; children: ExpressionNode[] }
  | { kind: 'or'; children: ExpressionNode[] };

export type DigitalJSStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseDigitalJSResult {
  status: DigitalJSStatus;
  error: string | null;
}