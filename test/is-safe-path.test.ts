import path from 'node:path';
import fse from '@zokugun/fs-extra-plus/sync';
import { isArray, isRecord } from '@zokugun/is-it-type';
import { xtry } from '@zokugun/xtry/sync';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { isSafePath, type Target } from '../src/index.js';

const ROOT = path.join('.', 'test', 'fixtures');

const walkResult = fse.walk(ROOT, {
	absolute: true,
	onlyFiles: true,
	filter: (item) => path.basename(item.path).startsWith('is-safe-path.') && item.path.endsWith('.yml'),
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
		const groupName = path.basename(filePath, '.yml').slice(13);
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
					safe: {
						'posix': boolean;
						'universal': boolean;
						'linux.safe': boolean;
						'linux.esc.single': boolean;
						'linux.esc.ansic': boolean;
						'macos.hfs.safe': boolean;
						'macos.hfs.esc.single': boolean;
						'macos.hfs.esc.ansic': boolean;
						'macos.apfs.safe': boolean;
						'macos.apfs.esc.single': boolean;
						'macos.apfs.esc.ansic': boolean;
						'macos.safe': boolean;
						'windows.exfat': boolean;
						'windows.fat32': boolean;
						'windows.ntfs': boolean;
						'windows.safe': boolean;
					};
				};

				it(test.name ?? test.path, () => {
					const results = {};

					for(const target of Object.keys(test.safe) as Target[]) {
						results[target] = isSafePath(test.path, target);
					}

					expect(results).to.eql(test.safe);
				});
			}
		});
	}
}
