import { Sanitizer } from './sanitizer.js';
import { type Target } from './target.js';
import { normalizeTarget } from './utils/normalize-target.js';

export function sanitizeSegment(segment: string, options: { replacement?: string | null; target?: Target | 'auto' } = {}): string {
	const normalizedTarget = normalizeTarget(options.target);
	const sanitizer = Sanitizer.getInstance(normalizedTarget);

	return sanitizer.sanitizeSegment(segment, options);
}
