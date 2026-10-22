export function precisionAt5(relevances: number[]): number {
  const top = relevances.slice(0, 5);
  if (top.length === 0) return 0;
  return top.filter((relevance) => relevance >= 2).length / top.length;
}

export function dcgAt5(relevances: number[]): number {
  return relevances.slice(0, 5).reduce((total, relevance, index) => {
    const gain = 2 ** relevance - 1;
    return total + gain / Math.log2(index + 2);
  }, 0);
}

export function ndcgAt5(relevances: number[]): number {
  const ideal = [...relevances].sort((left, right) => right - left).slice(0, 5);
  const idealDcg = dcgAt5(ideal);
  return idealDcg === 0 ? 0 : dcgAt5(relevances) / idealDcg;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
