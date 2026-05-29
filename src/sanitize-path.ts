import { type DResult } from '@zokugun/xtry';
import { Sanitizer } from './sanitizer.js';
import { type Resolver, type Target } from './target.js';
import { normalizeTarget } from './utils/normalize-target.js';

export function sanitizePath(
	path: string,
	options: {
		absolute?: boolean;
		parent?: string | null;
		replacement?: string | null;
		resolve?: Resolver | null;
		target?: Target | 'auto';
	} = {},
): DResult<string> {
	const normalizedTarget = normalizeTarget(options.target);
	const sanitizer = Sanitizer.getInstance(normalizedTarget);

	return sanitizer.sanitizePath(path, options as Parameters<typeof sanitizer.sanitizePath>[1]);
}
