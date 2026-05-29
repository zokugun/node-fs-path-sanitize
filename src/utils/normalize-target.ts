import os from 'node:os';
import { type Target } from '../target.js';

export function normalizeTarget(target?: Target | 'auto'): Target {
	if(target === 'auto') {
		const system = os.platform();

		if(system === 'darwin') {
			return 'macos.safe';
		}
		else if(system === 'win32' || system === 'cygwin') {
			return 'windows.safe';
		}
		else {
			return 'linux.safe';
		}
	}
	else {
		return target ?? 'universal';
	}
}
