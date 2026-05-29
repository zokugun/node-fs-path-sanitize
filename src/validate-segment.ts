import { type DResult } from '@zokugun/xtry';
import { Sanitizer } from './sanitizer.js';
import { type Target } from './target.js';
import { normalizeTarget } from './utils/normalize-target.js';

export function validateSegment(segment: string, target?: Target | 'auto'): DResult<string> {
	const normalizedTarget = normalizeTarget(target);
	const sanitizer = Sanitizer.getInstance(normalizedTarget);

	return sanitizer.validateSegment(segment);
}
