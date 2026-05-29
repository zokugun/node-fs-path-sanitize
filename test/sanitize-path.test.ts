import path from 'node:path';
import fse from '@zokugun/fs-extra-plus/sync';
import { isArray, isNumber, isRecord, isString } from '@zokugun/is-it-type';
import { xtry } from '@zokugun/xtry/sync';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { EmptyHandler, ReplaceHandler, type ReplaceListener, sanitizePath, Sanitizer, type Target } from '../src/index.js';
import { resolve } from './utils/resolve.js';

const ROOT = path.join('.', 'test', 'fixtures');

function buildListener(value: unknown, listeners: Record<string, ReplaceListener>): ReplaceListener | null {
	if(isString(value)) {
		return listeners[value] ?? (() => value);
	}

	return null;
}

const walkResult = fse.walk(ROOT, {
	absolute: true,
	onlyFiles: true,
	filter: (item) => path.basename(item.path).startsWith('sanitize-path.') && item.path.endsWith('.yml'),
});

if(walkResult.fails) {
	throw walkResult.error;
}
else {
	for(const file of walkResult.value) {
		if(file.fails) {
			throw file.error;
		}

		const filePath = file.value.path;
		const groupName = path.basename(filePath, '.yml').slice(9);
		const readResult = fse.readFile(filePath, 'utf8');
		const manifestResult = xtry(() => YAML.parse(readResult.value!) as unknown);

		if(manifestResult.fails) {
			console.error(filePath);

			throw manifestResult.error;
		}

		const manifest = manifestResult.value;

		if(!isArray(manifest)) {
			throw new Error(`The file "${path.relative(ROOT, filePath)}" isn't an array.`);
		}

		describe(groupName, () => {
			for(const data of manifest) {
				if(!isRecord(data)) {
					throw new Error('Expect an object');
				}

				const test = data as {
					name?: string;
					path: string;
					maxLength?: number;
					onKeyword?: string;
					onLeading?: string;
					onEmpty?: string;
					onTrailing?: string;
					replacement?: string;
					resolve?: boolean;
					sanitize: {
						'posix': string;
						'universal': string;
						'linux.safe': string;
						'linux.esc.single': string;
						'linux.esc.ansic': string;
						'macos.hfs.safe': string;
						'macos.hfs.esc.single': string;
						'macos.hfs.esc.ansic': string;
						'macos.apfs.safe': string;
						'macos.apfs.esc.single': string;
						'macos.apfs.esc.ansic': string;
						'macos.safe': string;
						'windows.exfat': string;
						'windows.fat32': string;
						'windows.ntfs': string;
						'windows.safe': string;
					};
				};

				it(test.name ?? test.path, () => {
					const results = {};

					if(isNumber(test.maxLength) || isString(test.onEmpty) || isString(test.onKeyword) || isString(test.onLeading) || isString(test.onTrailing)) {
						const options = {
							maxLength: isNumber(test.maxLength) ? test.maxLength : undefined,
							onEmpty: isString(test.onEmpty) ? (EmptyHandler[test.onEmpty] ?? (() => test.onEmpty!)) : undefined,
							onKeyword: buildListener(test.onKeyword, ReplaceHandler),
							onLeading: buildListener(test.onLeading, ReplaceHandler),
							onTrailing: buildListener(test.onTrailing, ReplaceHandler),
							replacement: test.replacement,
						};

						for(const target of Object.keys(test.sanitize) as Target[]) {
							const sanitizer = new Sanitizer({ ...options, target });
							const result = sanitizer.sanitizePath(test.path);

							if(result.fails) {
								results[target] = { error: result.error };
							}
							else {
								results[target] = result.value;
							}
						}
					}
					else {
						for(const target of Object.keys(test.sanitize) as Target[]) {
							const result = sanitizePath(test.path, {
								replacement: test.replacement,
								resolve: test.resolve ? resolve : null,
								target,
							});

							if(result.fails) {
								results[target] = { error: result.error };
							}
							else {
								results[target] = result.value;
							}
						}
					}

					expect(results).to.eql(test.sanitize);
				});
			}
		});
	}
}
