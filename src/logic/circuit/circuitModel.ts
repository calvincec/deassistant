import { CircuitGate, CircuitModel, Implicant } from '@/types/logic';

/**
 * Circuit Model Generator
 * Creates a JSON representation of the logic circuit
 * This is a placeholder for future circuit rendering integration
 */

export function generateCircuitModel(
  expression: string,
  implicants: Implicant[],
  variableLabels: string[],
  outputFormat: 'SOP' | 'POS'
): CircuitModel {
  const gates: CircuitGate[] = [];
  const connections: { from: string; to: string }[] = [];
  
  // Create input gates
  variableLabels.forEach((label, idx) => {
    gates.push({
      id: `input_${label}`,
      type: 'INPUT',
      inputs: [],
      output: `wire_${label}`,
      label,
    });
  });

  if (outputFormat === 'SOP') {
    return generateSOPCircuit(gates, connections, implicants, variableLabels);
  } else {
    return generatePOSCircuit(gates, connections, implicants, variableLabels);
  }
}

function generateSOPCircuit(
  gates: CircuitGate[],
  connections: { from: string; to: string }[],
  implicants: Implicant[],
  variableLabels: string[]
): CircuitModel {
  const andOutputs: string[] = [];
  let gateCounter = 0;

  // Create NOT gates for complemented variables
  const notGates = new Set<string>();
  implicants.forEach(imp => {
    for (let i = 0; i < imp.binary.length; i++) {
      if (imp.binary[i] === '0') {
        notGates.add(variableLabels[i]);
      }
    }
  });

  notGates.forEach(label => {
    const notId = `not_${label}`;
    gates.push({
      id: notId,
      type: 'NOT',
      inputs: [`wire_${label}`],
      output: `wire_${label}_not`,
      label: `${label}'`,
    });
    connections.push({ from: `wire_${label}`, to: notId });
  });

  // Create AND gates for each product term
  implicants.forEach((imp, impIdx) => {
    const inputs: string[] = [];
    
    for (let i = 0; i < imp.binary.length; i++) {
      if (imp.binary[i] === '1') {
        inputs.push(`wire_${variableLabels[i]}`);
      } else if (imp.binary[i] === '0') {
        inputs.push(`wire_${variableLabels[i]}_not`);
      }
    }

    if (inputs.length === 0) {
      // Constant 1
      andOutputs.push('vcc');
    } else if (inputs.length === 1) {
      // Single input, no AND gate needed
      andOutputs.push(inputs[0]);
    } else {
      const andId = `and_${gateCounter++}`;
      const andOutput = `wire_and_${impIdx}`;
      gates.push({
        id: andId,
        type: 'AND',
        inputs,
        output: andOutput,
        label: describeTerm(imp.binary, variableLabels),
      });
      inputs.forEach(inp => connections.push({ from: inp, to: andId }));
      andOutputs.push(andOutput);
    }
  });

  // Create OR gate for sum of products
  if (andOutputs.length === 0) {
    gates.push({
      id: 'output_f',
      type: 'OUTPUT',
      inputs: ['gnd'],
      output: 'F',
      label: 'F = 0',
    });
  } else if (andOutputs.length === 1) {
    gates.push({
      id: 'output_f',
      type: 'OUTPUT',
      inputs: andOutputs,
      output: 'F',
      label: 'F',
    });
    connections.push({ from: andOutputs[0], to: 'output_f' });
  } else {
    const orId = 'or_final';
    gates.push({
      id: orId,
      type: 'OR',
      inputs: andOutputs,
      output: 'wire_or',
    });
    andOutputs.forEach(out => connections.push({ from: out, to: orId }));

    gates.push({
      id: 'output_f',
      type: 'OUTPUT',
      inputs: ['wire_or'],
      output: 'F',
      label: 'F',
    });
    connections.push({ from: 'wire_or', to: 'output_f' });
  }

  return {
    gates,
    inputs: variableLabels,
    outputs: ['F'],
    connections,
  };
}

function generatePOSCircuit(
  gates: CircuitGate[],
  connections: { from: string; to: string }[],
  implicants: Implicant[],
  variableLabels: string[]
): CircuitModel {
  const orOutputs: string[] = [];
  let gateCounter = 0;

  // Create NOT gates for complemented variables
  const notGates = new Set<string>();
  implicants.forEach(imp => {
    for (let i = 0; i < imp.binary.length; i++) {
      if (imp.binary[i] === '1') {
        notGates.add(variableLabels[i]);
      }
    }
  });

  notGates.forEach(label => {
    const notId = `not_${label}`;
    gates.push({
      id: notId,
      type: 'NOT',
      inputs: [`wire_${label}`],
      output: `wire_${label}_not`,
      label: `${label}'`,
    });
    connections.push({ from: `wire_${label}`, to: notId });
  });

  // Create OR gates for each sum term
  implicants.forEach((imp, impIdx) => {
    const inputs: string[] = [];
    
    for (let i = 0; i < imp.binary.length; i++) {
      if (imp.binary[i] === '0') {
        inputs.push(`wire_${variableLabels[i]}`);
      } else if (imp.binary[i] === '1') {
        inputs.push(`wire_${variableLabels[i]}_not`);
      }
    }

    if (inputs.length === 0) {
      orOutputs.push('gnd');
    } else if (inputs.length === 1) {
      orOutputs.push(inputs[0]);
    } else {
      const orId = `or_${gateCounter++}`;
      const orOutput = `wire_or_${impIdx}`;
      gates.push({
        id: orId,
        type: 'OR',
        inputs,
        output: orOutput,
      });
      inputs.forEach(inp => connections.push({ from: inp, to: orId }));
      orOutputs.push(orOutput);
    }
  });

  // Create AND gate for product of sums
  if (orOutputs.length === 0) {
    gates.push({
      id: 'output_f',
      type: 'OUTPUT',
      inputs: ['vcc'],
      output: 'F',
      label: 'F = 1',
    });
  } else if (orOutputs.length === 1) {
    gates.push({
      id: 'output_f',
      type: 'OUTPUT',
      inputs: orOutputs,
      output: 'F',
      label: 'F',
    });
    connections.push({ from: orOutputs[0], to: 'output_f' });
  } else {
    const andId = 'and_final';
    gates.push({
      id: andId,
      type: 'AND',
      inputs: orOutputs,
      output: 'wire_and',
    });
    orOutputs.forEach(out => connections.push({ from: out, to: andId }));

    gates.push({
      id: 'output_f',
      type: 'OUTPUT',
      inputs: ['wire_and'],
      output: 'F',
      label: 'F',
    });
    connections.push({ from: 'wire_and', to: 'output_f' });
  }

  return {
    gates,
    inputs: variableLabels,
    outputs: ['F'],
    connections,
  };
}

function describeTerm(binary: string, labels: string[]): string {
  let term = '';
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      term += labels[i];
    } else if (binary[i] === '0') {
      term += labels[i] + "'";
    }
  }
  return term || '1';
}

// Export circuit as JSON for future rendering tools
export function exportCircuitJSON(circuit: CircuitModel): string {
  return JSON.stringify(circuit, null, 2);
}
