import { Sanitizer } from './sanitizer.js';
import { type Target } from './target.js';
import { normalizeTarget } from './utils/normalize-target.js';

export function isSafePath(path: string, target?: Target | 'auto'): boolean {
	const normalizedTarget = normalizeTarget(target);
	const sanitizer = Sanitizer.getInstance(normalizedTarget);

	return sanitizer.isSafePath(path);
}
