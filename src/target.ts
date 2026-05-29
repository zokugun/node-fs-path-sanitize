export type Target =
	// general
	| 'posix'
	| 'universal'
	// linux
	| 'linux.safe'
	| 'linux.esc.single'
	| 'linux.esc.ansic'
	// macOS
	| 'macos.hfs.safe'
	| 'macos.hfs.esc.single'
	| 'macos.hfs.esc.ansic'
	| 'macos.apfs.safe'
	| 'macos.apfs.esc.single'
	| 'macos.apfs.esc.ansic'
	| 'macos.safe'
	// windows
	| 'windows.exfat'
	| 'windows.fat32'
	| 'windows.ntfs'
	| 'windows.safe';

export enum Feature {
	Linux = 1 << 0,
	Macos = 1 << 1,
	Posix = 1 << 2,
	Windows = 1 << 3,
	CharacterExFAT = 1 << 4,
	CharacterFAT32 = 1 << 5,
	CharacterHFS = 1 << 6,
	CharacterShell = 1 << 7,
	Control = 1 << 8,
	KeywordFAT32 = 1 << 9,
	KeywordNTFS = 1 << 10,
	PositionalFAT32 = 1 << 11,
	PositionalShell = 1 << 12,
	VolumeRootNTFS = 1 << 13,
}

/* eslint-disable quote-props,operator-linebreak */
export const TARGET_FEATURES: Record<Target, Feature> = {
	// general
	'posix':
		Feature.Posix |
		Feature.PositionalShell,
	'universal':
		Feature.CharacterFAT32 |
		Feature.CharacterShell |
		Feature.Control |
		Feature.KeywordFAT32 |
		Feature.KeywordNTFS |
		Feature.PositionalFAT32 |
		Feature.PositionalShell,
	// linux
	'linux.safe':
		Feature.CharacterShell |
		Feature.Control |
		Feature.PositionalShell,
	'linux.esc.single':
		Feature.Control,
	'linux.esc.ansic': Feature.Linux,
	// macOS
	'macos.hfs.safe':
		Feature.CharacterHFS |
		Feature.CharacterShell |
		Feature.Control |
		Feature.PositionalShell,
	'macos.hfs.esc.single':
		Feature.Control,
	'macos.hfs.esc.ansic': Feature.Macos,
	'macos.apfs.safe':
		Feature.CharacterShell |
		Feature.Control |
		Feature.PositionalShell,
	'macos.apfs.esc.single':
		Feature.Control,
	'macos.apfs.esc.ansic': Feature.Macos,
	'macos.safe':
		Feature.CharacterHFS |
		Feature.CharacterShell |
		Feature.Control |
		Feature.PositionalShell,
	// windows
	'windows.exfat':
		Feature.Windows |
		Feature.CharacterExFAT |
		Feature.Control,
	'windows.fat32':
		Feature.Windows |
		Feature.CharacterFAT32 |
		Feature.Control |
		Feature.KeywordFAT32 |
		Feature.PositionalFAT32,
	'windows.ntfs':
		Feature.Windows |
		Feature.CharacterExFAT |
		Feature.Control |
		Feature.KeywordFAT32 |
		Feature.KeywordNTFS |
		Feature.PositionalFAT32 |
		Feature.VolumeRootNTFS,
	'windows.safe':
		Feature.Windows |
		Feature.CharacterFAT32 |
		Feature.Control |
		Feature.KeywordFAT32 |
		Feature.KeywordNTFS |
		Feature.PositionalFAT32 |
		Feature.VolumeRootNTFS,
};
/* eslint-enable quote-props,operator-linebreak */

export type Resolver = ((path: string) => string) | ((path: string, separator: string) => string);
