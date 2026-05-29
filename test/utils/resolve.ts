import path from 'node:path';

export function resolve(input: string, separator: string): string {
	if(input.length === 0) {
		return separator === '/' ? '/users/user' : 'C:\\Users\\User';
	}
	else if(path.isAbsolute(input)) {
		return path.normalize(input);
	}

	if(separator === '/') {
		const fullPath = path.posix.join('/users/user', input);

		return path.posix.normalize(fullPath);
	}
	else {
		const fullPath = path.win32.join('C:\\Users\\User', input);

		return path.win32.normalize(fullPath);
	}
}
