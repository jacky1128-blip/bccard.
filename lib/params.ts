// searchParams 값 하나를 문자열로
export type SP = Record<string, string | string[] | undefined>;
export const q = (sp: SP, k: string): string | undefined => {
  const v = sp[k];
  return typeof v === 'string' && v ? v : undefined;
};
