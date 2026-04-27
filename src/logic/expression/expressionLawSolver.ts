import { OutputFormat, QMCStep, SolverResult } from '@/types/logic';
import {
  expressionAstToString,
  parseBooleanExpression,
  reduceExpressionByLaws,
} from './expressionEngine';

export function solveExpressionByLaws(
  expression: string,
  variableLabels: string[],
  outputFormat: OutputFormat
): SolverResult {
  const ast = parseBooleanExpression(expression, variableLabels);
  const reduced = reduceExpressionByLaws(ast);

  const rawExpression = expressionAstToString(ast);
  const simplifiedExpression = expressionAstToString(reduced.simplified);

  const steps: QMCStep[] = [
    {
      title: 'Step 1: Parse Expression',
      description: 'Parsed the expression and normalized operators before applying algebraic laws.',
      data: { type: 'final', expression: rawExpression },
    },
  ];

  reduced.steps.forEach((step, index) => {
    steps.push({
      title: `Step ${index + 2}: ${step.rule}`,
      description: `${step.before}  =>  ${step.after}`,
      data: { type: 'final', expression: step.after },
    });
  });

  if (reduced.steps.length === 0) {
    steps.push({
      title: 'Step 2: No Law Reduction Needed',
      description: 'The expression is already in a simplified algebraic form under supported laws.',
      data: { type: 'final', expression: simplifiedExpression },
    });
  }

  const expressionOut = outputFormat === 'POS' ? simplifiedExpression : simplifiedExpression;

  steps.push({
    title: `Step ${steps.length + 1}: Final Expression (${outputFormat})`,
    description: 'Using theorem-based reduction when tabular minimization is not feasible.',
    data: { type: 'final', expression: expressionOut },
  });

  return {
    expression: expressionOut,
    implicants: [],
    essentialImplicants: [],
    steps,
  };
}
