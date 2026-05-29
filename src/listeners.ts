export type EmptyListener = (replacement: string) => string;
export type ReplacerArray = [match: string, ...groups: Array<string | undefined>, offset: number, input: string];
export type ReplaceListener = (args: ReplacerArray, replacement: string) => string;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const EmptyHandler: Record<string, EmptyListener> = {
	addExclamation: () => '!',
	addReplacement: (replacement) => replacement,
	addUnderscore: () => '_',
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ReplaceHandler: Record<string, ReplaceListener> = {
	addLeadingExclamation: ([match]) => `!${match}`,
	addLeadingReplacement: ([match], replacement) => `${replacement}${match}`,
	addLeadingUnderscore: ([match]) => `_${match}`,
	addTrailingExclamation: ([match]) => `${match}!`,
	addTrailingReplacement: ([match], replacement) => `${match}${replacement}`,
	addTrailingUnderscore: ([match]) => `${match}_`,
};
