export function toUnicodeEscape(value: string): string {
	const length = value.length;

	let result = '';

	for(let i = 0; i < length; i++) {
		// eslint-disable-next-line unicorn/prefer-code-point
		const c = value.charCodeAt(i);

		if(c > 255) {
			result += '\\u' + c.toString(16).toUpperCase().padStart(4, '0');
		}
		else {
			result += c.toString();
		}
	}

	return result;
}
