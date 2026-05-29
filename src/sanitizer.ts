import { isFunction, isNonEmptyArray, isNullable, isNumber, isString } from '@zokugun/is-it-type';
import { type DResult, err, ok } from '@zokugun/xtry';
import { type EmptyListener, type ReplaceListener, type ReplacerArray } from './listeners.js';
import { Feature, type Resolver, type Target, TARGET_FEATURES } from './target.js';
import { toUnicodeEscape } from './utils/to-unicode-escape.js';

type Options = {
	additionalKeywords?: RegExp[] | null;
	maxLength?: number | null;
	minLength?: number | null;
	onEmpty?: EmptyListener | null;
	onKeyword?: ReplaceListener | null;
	onLeading?: ReplaceListener | null;
	onTrailing?: ReplaceListener | null;
	replacement?: string | null;
	target?: Target | null;
};

// https://en.wikipedia.org/wiki/Filename
// https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file
// https://en.wikipedia.org/wiki/Template:General_Category_(Unicode)
// \p{Control}: 0-31, 127
// \p{Zl}: Line_Separator
// \p{Zp}: Paragraph_Separator

const CONTROL_REGEX = /(?!\u200D)[\p{Control}\p{Format}\p{Zl}\p{Zp}]+/gu;
const EXFAT_CHARACTER_REGEX = /["*:<>?|]+/g;
// eslint-disable-next-line unicorn/better-regex
const FAT32_KEYWORD_REGEX = /^(?:CON|PRN|AUX|NUL|COM\d|COM¹|COM²|COM³|LPT\d|LPT¹|LPT²|LPT³|CLOCK\$|CONIN\$|CONOUT\$|CONERR\$|CONFIG\$)(?:\..*)?$/i;
const FAT32_CHARACTER_REGEX = /["*:<>?|+,;=[\]]+/g;
const FAT32_LEADING_REGEX = /^ +/;
const FAT32_TRAILING_REGEX = /[. ]+$/;
const HFS_CHARACTER_REGEX = /:+/g;
// eslint-disable-next-line unicorn/better-regex
const NTFS_ROOT_REGEX = /^(?:\$Mft|\$MftMirr|\$LogFile|\$Volume|\$AttrDef|\$Bitmap|\$Boot|\$BadClus|\$Secure|\$Upcase|\$Extend|\$Quota|\$ObjId|\$Reparse)$/i;
// eslint-disable-next-line no-control-regex
const NUL_REGEX = /\u0000+/g;
const PATH_RELATIVE_REGEX = /^\.+(?:[/\\](?:\.*[/\\]+)*|$)|[/\\]+\.*(?:[/\\]|$)|[/\\]+/g;
const PATH_SEPARATOR_REGEX = /[/\\]+/g;
const POSIX_CHARACTER_REGEX = /[^\w.-]+/g;
const POSIX_SEPARATOR = /\//;
const SHELL_CHARACTER_REGEX = /[ *?[\]$`"'|&;<>]+/g;
const SHELL_LEADING_REGEX = /^-+/;
const UNICODE_REGEX = /(?!\u200D)[\uFFF0-\uFFFF]+/gu;
const UNIVERSAL_SEPARATOR = /[/\\]/;
const WHITESPACE_REGEX = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/gu;
const WINDOWS_DRIVE = /^([A-Za-z]:|\\\\[^\\]+\\[^\\]+)\\?(.*)$/;
const WINDOWS_SEPARATOR = /\\/;

type SanitizePathOptions = {
	absolute?: boolean;
	replacement?: string | null;
	resolve?: Resolver | null;
};

const EMPTY_LISTENER: EmptyListener = (replacement) => replacement;
const REPLACE_LISTENER: ReplaceListener = (_args, replacement) => replacement;

const $instances: Partial<Record<Target, Sanitizer | undefined>> = {};

let $segmenter: Intl.Segmenter | undefined;

export class Sanitizer {
	private readonly _features: Feature;
	private readonly _keywords: RegExp[] = [];
	private readonly _maxLength: number = 100;
	private readonly _minLength: number = 1;
	private readonly _onEmpty: EmptyListener = EMPTY_LISTENER;
	private readonly _onKeyword: ReplaceListener = REPLACE_LISTENER;
	private readonly _onLeading: ReplaceListener = REPLACE_LISTENER;
	private readonly _onTrailing: ReplaceListener = REPLACE_LISTENER;
	private readonly _replacement: string = '';
	private readonly _replacements = new Map<string, string>();
	private readonly _separator: RegExp;
	private readonly _target: Target = 'universal';

	constructor({ additionalKeywords, maxLength, minLength, onEmpty, onKeyword, onLeading, onTrailing, replacement, target }: Options) { // {{{
		if(isNonEmptyArray(additionalKeywords)) {
			this._keywords.push(...additionalKeywords);
		}

		if(isNumber(minLength)) {
			this._minLength = Math.max(minLength, 1);
		}

		if(isNumber(maxLength)) {
			this._maxLength = Math.max(maxLength, this._minLength);
		}

		if(isFunction(onEmpty)) {
			this._onEmpty = onEmpty;
		}

		if(isFunction(onKeyword)) {
			this._onKeyword = onKeyword;
		}

		if(isFunction(onLeading)) {
			this._onLeading = onLeading;
		}

		if(isFunction(onTrailing)) {
			this._onTrailing = onTrailing;
		}

		if(isString(target)) {
			this._target = target;
		}

		this._features = TARGET_FEATURES[this._target];

		if(this.hasFeature(Feature.KeywordFAT32)) {
			this._keywords.unshift(FAT32_KEYWORD_REGEX);
		}

		if(isString(replacement)) {
			this._replacement = this.sanitizeReplacement(replacement);
		}

		if(this.hasFeature(Feature.Windows)) {
			this._separator = WINDOWS_SEPARATOR;
		}
		else if(this._target === 'universal') {
			this._separator = UNIVERSAL_SEPARATOR;
		}
		else {
			this._separator = POSIX_SEPARATOR;
		}
	} // }}}

	public static getInstance(target: Target): Sanitizer { // {{{
		$instances[target] ??= new Sanitizer({ target: target });

		return $instances[target];
	} // }}}

	public isSafePath(path: string): boolean { // {{{
		const result = this.validatePath(path);

		return !result.fails;
	} // }}}

	public isSafeSegment(segment: string): boolean { // {{{
		const result = this.validateSegment(segment);

		return !result.fails;
	} // }}}

	public sanitizePath(path: string, { absolute, replacement, resolve }: SanitizePathOptions = {}): DResult<string> { // {{{
		if(this.hasFeature(Feature.Windows)) {
			if(path.includes('/')) {
				return err('Invalid Windows path: Unix path');
			}

			const resolvedPath = resolve ? resolve(path, '\\') : path;
			const match = WINDOWS_DRIVE.exec(resolvedPath);

			let result: DResult<string>;

			if(match) {
				const [, drive, drivelessPath] = match;

				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				result = this.sanitizeWindowsPathWithDrive(drive, drivelessPath, replacement, absolute || Boolean(resolve));
			}
			else {
				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				result = this.sanitizeWindowsPathWithoutDrive(resolvedPath, replacement, absolute || Boolean(resolve));
			}

			if(result.fails) {
				return result;
			}
			else {
				return result;
			}
		}
		else if(this._target === 'universal') {
			if(path.includes('\\') || WINDOWS_DRIVE.test(path)) {
				const resolvedPath = resolve ? resolve(path, '\\') : path;
				const match = WINDOWS_DRIVE.exec(resolvedPath);

				let result: DResult<string>;

				if(match) {
					const [, drive, drivelessPath] = match;

					// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
					result = this.sanitizeWindowsPathWithDrive(drive, drivelessPath, replacement, absolute || Boolean(resolve));
				}
				else {
					// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
					result = this.sanitizeWindowsPathWithoutDrive(resolvedPath, replacement, absolute || Boolean(resolve));
				}

				if(result.fails) {
					return result;
				}
				else {
					return result;
				}
			}
			else {
				const resolvedPath = resolve ? resolve(path, '/') : path;

				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				const result = this.sanitizePosixPath(resolvedPath, replacement, absolute || Boolean(resolve));

				if(result.fails) {
					return result;
				}
				else {
					return result;
				}
			}
		}
		else {
			if(path.includes('\\')) {
				return err('Invalid Unix path: Windows path');
			}

			const resolvedPath = resolve ? resolve(path, '/') : path;

			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			const result = this.sanitizePosixPath(resolvedPath, replacement, absolute || Boolean(resolve));

			if(result.fails) {
				return result;
			}
			else {
				return result;
			}
		}
	} // }}}

	public sanitizeSegment(segment: string, { replacement }: { replacement?: string | null } = {}): string { // {{{
		replacement = this.getCachedReplacement(replacement);

		const marker = replacement.length === 0 ? '' : '\0';
		const replacer = this.buildkeywordReplacer(marker);

		let sanitized = segment.normalize('NFC');

		if(this.hasFeature(Feature.Posix)) {
			sanitized = this.replaceCharacters(sanitized, marker);

			sanitized = sanitized.replaceAll(PATH_RELATIVE_REGEX, marker);
		}
		else {
			sanitized = sanitized
				.replaceAll(WHITESPACE_REGEX, ' ')
				.replaceAll(PATH_RELATIVE_REGEX, marker);

			sanitized = this.replaceCharacters(sanitized, marker);
		}

		sanitized = this.replaceKeywords(sanitized, marker, replacer, replacement);

		if(sanitized.length > this._maxLength) {
			sanitized = this.truncate(sanitized);
			sanitized = this.replaceKeywords(sanitized, marker, replacer, replacement);
		}

		return sanitized;
	} // }}}

	public validatePath(path: string): DResult<string> { // {{{
		let segments: string[];

		if(this.hasFeature(Feature.Windows)) {
			const match = WINDOWS_DRIVE.exec(path);
			if(!match) {
				return err('Invalid Windows path: Unix path');
			}

			segments = match[1].split(this._separator);

			if(segments.length === 0) {
				return ok(path);
			}

			if(this.hasFeature(Feature.VolumeRootNTFS) && NTFS_ROOT_REGEX.test(segments[0])) {
				return err(`Invalid NTFS volume root: ${segments[0]}`);
			}
		}
		else if(this._target === 'universal') {
			const match = WINDOWS_DRIVE.exec(path);

			if(match) {
				segments = match[1].split('\\');

				if(segments.length === 0) {
					return ok(path);
				}

				if(NTFS_ROOT_REGEX.test(segments[0])) {
					return err(`Invalid NTFS volume root: ${segments[0]}`);
				}
			}
			else {
				segments = path.split('/');
			}
		}
		else {
			if(WINDOWS_DRIVE.test(path)) {
				return err('Invalid Unix path: Windows path');
			}

			segments = path.split(this._separator);
		}

		for(const segment of segments) {
			const result = this.validateSegment(segment);
			if(result.fails) {
				return result;
			}
		}

		return ok(path);
	} // }}}

	public validateSegment(segment: string): DResult<string> { // {{{
		let match: RegExpExecArray | null;

		if(this.hasFeature(Feature.Posix)) {
			match = POSIX_CHARACTER_REGEX.exec(segment);

			if(match) {
				return err(`Invalid character: ${match[0]}`);
			}
		}
		else {
			match = WHITESPACE_REGEX.exec(segment);

			if(match) {
				return err(`Invalid whitespace: ${toUnicodeEscape(match[0])}`);
			}

			match = UNICODE_REGEX.exec(segment);

			if(match) {
				return err(`Invalid unicode: ${toUnicodeEscape(match[0])}`);
			}

			if(this.hasFeature(Feature.Control)) {
				match = CONTROL_REGEX.exec(segment);

				if(match) {
					return err(`Invalid character: ${match[0]}`);
				}
			}

			if(this.hasFeature(Feature.CharacterExFAT)) {
				match = EXFAT_CHARACTER_REGEX.exec(segment);

				if(match) {
					return err(`Invalid character: ${match[0]}`);
				}
			}

			if(this.hasFeature(Feature.CharacterFAT32)) {
				match = FAT32_CHARACTER_REGEX.exec(segment);

				if(match) {
					return err(`Invalid character: ${match[0]}`);
				}
			}

			if(this.hasFeature(Feature.CharacterHFS)) {
				match = HFS_CHARACTER_REGEX.exec(segment);

				if(match) {
					return err(`Invalid character: ${match[0]}`);
				}
			}

			if(this.hasFeature(Feature.CharacterShell)) {
				match = SHELL_CHARACTER_REGEX.exec(segment);

				if(match) {
					return err(`Invalid character: ${match[0]}`);
				}
			}
		}

		match = PATH_RELATIVE_REGEX.exec(segment);

		if(match) {
			return err(`Invalid relative path: ${match[0]}`);
		}

		if(segment.length > this._maxLength) {
			return err(`Invalid length: ${segment.length}/${this._maxLength}`);
		}

		for(const keyword of this._keywords) {
			match = keyword.exec(segment);

			if(match) {
				return err(`Invalid keyword: ${match[0]}`);
			}
		}

		if(this.hasFeature(Feature.PositionalFAT32)) {
			match = FAT32_LEADING_REGEX.exec(segment);

			if(match) {
				return err(`Invalid leading: ${match[0]}`);
			}

			match = FAT32_TRAILING_REGEX.exec(segment);

			if(match) {
				return err(`Invalid trailing: ${match[0]}`);
			}
		}

		if(this.hasFeature(Feature.PositionalShell)) {
			match = SHELL_LEADING_REGEX.exec(segment);

			if(match) {
				return err(`Invalid leading: ${match[0]}`);
			}
		}

		return ok(segment);
	} // }}}

	private readonly buildkeywordReplacer = (marker: string) => (...args: ReplacerArray) => this._onKeyword(args, marker);

	private getCachedReplacement(replacement?: string | null): string { // {{{
		if(isNullable(replacement)) {
			return this._replacement;
		}
		else if(replacement.length === 0) {
			return '';
		}
		else if(this._replacements.has(replacement)) {
			return this._replacements.get(replacement)!;
		}

		const sanitized = this.sanitizeReplacement(replacement);

		this._replacements.set(replacement, sanitized);

		return sanitized;
	} // }}}

	private hasFeature(feature: Feature): boolean { // {{{
		// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
		return (this._features & feature) === feature;
	} // }}}

	private replaceCharacters(sanitized: string, marker: string): string { // {{{
		if(this.hasFeature(Feature.Posix)) {
			sanitized = sanitized.replaceAll(POSIX_CHARACTER_REGEX, marker);
		}
		else {
			if(this.hasFeature(Feature.Control)) {
				sanitized = sanitized.replaceAll(CONTROL_REGEX, marker);
			}

			if(this.hasFeature(Feature.CharacterExFAT)) {
				sanitized = sanitized.replaceAll(EXFAT_CHARACTER_REGEX, marker);
			}

			if(this.hasFeature(Feature.CharacterFAT32)) {
				sanitized = sanitized.replaceAll(FAT32_CHARACTER_REGEX, marker);
			}

			if(this.hasFeature(Feature.CharacterHFS)) {
				sanitized = sanitized.replaceAll(HFS_CHARACTER_REGEX, marker);
			}

			if(this.hasFeature(Feature.CharacterShell)) {
				sanitized = sanitized.replaceAll(SHELL_CHARACTER_REGEX, marker);
			}
		}

		return sanitized;
	} // }}}

	private replaceKeywords(input: string, marker: string, replacer: (...args: ReplacerArray) => string, replacement: string): string { // {{{
		let sanitized = input;

		for(const keyword of this._keywords) {
			sanitized = sanitized.replace(keyword, replacer);
		}

		if(replacement.length === 0) {
			sanitized = sanitized.replaceAll(NUL_REGEX, replacement);

			sanitized = this.replaceLeadingAndTrailing(sanitized, marker);
		}
		else {
			sanitized = this.replaceLeadingAndTrailing(sanitized, marker);

			sanitized = sanitized.replaceAll(NUL_REGEX, replacement);
		}

		sanitized = sanitized.replaceAll(PATH_RELATIVE_REGEX, replacement);

		if(sanitized.length === 0) {
			sanitized = this.replaceCharacters(this._onEmpty(replacement), marker);
		}

		if(sanitized === input) {
			return sanitized;
		}

		sanitized = this.replaceKeywords(sanitized, marker, replacer, replacement);

		sanitized = this.replaceKeywords(sanitized, marker, replacer, '');

		if(sanitized.length === 0) {
			return this.replaceCharacters(this._onEmpty(''), '');
		}

		return sanitized;
	} // }}}

	private replaceLeadingAndTrailing(sanitized: string, replacement: string): string { // {{{
		if(this.hasFeature(Feature.PositionalFAT32)) {
			sanitized = sanitized

				.replace(FAT32_LEADING_REGEX, (...args) => this._onLeading(args as ReplacerArray, replacement))

				.replace(FAT32_TRAILING_REGEX, (...args) => this._onTrailing(args as ReplacerArray, replacement));
		}

		if(this.hasFeature(Feature.PositionalShell)) {
			sanitized = sanitized

				.replace(SHELL_LEADING_REGEX, (...args) => this._onLeading(args as ReplacerArray, replacement));
		}

		return sanitized;
	} // }}}

	private sanitizeNTFSRoot(segments: string[], replacement: string | null | undefined): void { // {{{
		const match = NTFS_ROOT_REGEX.exec(segments[0]);

		if(match) {
			const cachedReplacement = this.getCachedReplacement(replacement);

			// @ts-expect-error TS2339
			match.offset = match.index;

			segments[0] = this._onKeyword(match as unknown as ReplacerArray, cachedReplacement);
		}
	} // }}}

	private sanitizePosixPath(path: string, replacement: string | null | undefined, absolute: boolean): DResult<string> { // {{{
		const result: string[] = [];
		const segments = path.split(this._separator);

		if(segments.length === 0) {
			return ok(path);
		}
		else if(segments.length === 1 && !absolute) {
			return ok(this.sanitizeSegment(segments[0], { replacement }));
		}

		const startingSlash = path.startsWith('/');

		if(startingSlash) {
			segments.shift();
		}

		if(absolute) {
			for(const segment of segments) {
				result.push(this.sanitizeSegment(segment, { replacement }));
			}
		}
		else {
			for(const segment of segments) {
				if(segment === '.' || segment === '..') {
					result.push(segment);
				}
				else {
					result.push(this.sanitizeSegment(segment, { replacement }));
				}
			}
		}

		if(startingSlash) {
			return ok(`/${result.join('/')}`);
		}
		else {
			return ok(result.join('/'));
		}
	} // }}}

	private sanitizeReplacement(replacement: string): string { // {{{
		let sanitized = replacement;

		if(this.hasFeature(Feature.Posix)) {
			sanitized = sanitized.replaceAll(PATH_SEPARATOR_REGEX, '');

			sanitized = this.replaceCharacters(sanitized, '');
		}
		else {
			sanitized = sanitized.replaceAll(UNICODE_REGEX, '');

			sanitized = this.replaceCharacters(sanitized, '');

			sanitized = sanitized.replaceAll(PATH_SEPARATOR_REGEX, '');
		}

		return sanitized;
	} // }}}

	private sanitizeWindowsPathWithDrive(drive: string, path: string, replacement: string | null | undefined, absolute: boolean): DResult<string> { // {{{
		const segments = path.split(this._separator);

		if(segments.length === 0) {
			return ok(path);
		}

		if(this.hasFeature(Feature.VolumeRootNTFS)) {
			this.sanitizeNTFSRoot(segments, replacement);
		}

		const result: string[] = [drive];

		if(absolute) {
			for(const segment of segments) {
				result.push(this.sanitizeSegment(segment, { replacement }));
			}
		}
		else {
			for(const segment of segments) {
				if(segment === '.' || segment === '..') {
					result.push(segment);
				}
				else {
					result.push(this.sanitizeSegment(segment, { replacement }));
				}
			}
		}

		return ok(result.join('\\'));
	} // }}}

	private sanitizeWindowsPathWithoutDrive(path: string, replacement: string | null | undefined, absolute: boolean): DResult<string> { // {{{
		const segments = path.split(this._separator);

		const result: string[] = [];

		if(absolute) {
			for(const segment of segments) {
				result.push(this.sanitizeSegment(segment, { replacement }));
			}
		}
		else {
			for(const segment of segments) {
				if(segment === '.' || segment === '..') {
					result.push(segment);
				}
				else {
					result.push(this.sanitizeSegment(segment, { replacement }));
				}
			}
		}

		return ok(result.join('\\'));
	} // }}}

	private truncate(path: string): string { // {{{
		const extensionIndex = path.lastIndexOf('.');

		let maxLength = this._maxLength;
		let extension: string;
		let truncated: string;

		if(extensionIndex === -1) {
			extension = '';
			truncated = path.replace(/ +$/, '');
		}
		else {
			extension = path.slice(extensionIndex);
			maxLength = Math.max(0, maxLength - extension.length);
			truncated = path.slice(0, extensionIndex).replace(/ +$/, '');
		}

		if(truncated.length > maxLength) {
			$segmenter ??= new Intl.Segmenter(undefined, {
				granularity: 'grapheme',
			});

			let result = '';

			for(const { segment } of $segmenter.segment(truncated)) {
				if(result.length + segment.length > maxLength) {
					break;
				}

				result += segment;
			}

			truncated = result.replace(/ +$/, '');
		}

		return truncated + extension;
	} // }}}
}
