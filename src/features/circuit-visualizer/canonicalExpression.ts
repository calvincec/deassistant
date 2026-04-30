import { CanonicalForm } from '@/types/logic';

function bitString(value: number, bits: number): string {
  return value.toString(2).padStart(bits, '0');
}

export function buildCanonicalSOP(canonical: CanonicalForm, outputName = 'F'): string {
  const { minterms, variableCount, variableLabels } = canonical;

  if (!minterms || minterms.length === 0) return `${outputName} = 0`;

  const terms = minterms.slice().sort((a, b) => a - b).map((m) => {
    const bits = bitString(m, variableCount).split('');
    const literals = bits.map((b, i) => (b === '1' ? variableLabels[i] : `${variableLabels[i]}'`));
    return literals.join('');
  });

  // If minterms cover all possible input combinations, the canonical form is 1
  if (terms.length === Math.pow(2, variableCount)) return `${outputName} = 1`;

  return `${outputName} = ${terms.join(' + ')}`;
}

export default buildCanonicalSOP;
