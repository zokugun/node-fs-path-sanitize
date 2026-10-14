[@zokugun/fs-path-sanitize](https://github.com/zokugun/node-fs-path-sanitize)
==========================================================

[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![NPM Version](https://img.shields.io/npm/v/@zokugun/fs-path-sanitize.svg?colorB=green)](https://www.npmjs.com/package/@zokugun/fs-path-sanitize)
[![Donation](https://img.shields.io/badge/donate-ko--fi-green)](https://ko-fi.com/daiyam)
[![Donation](https://img.shields.io/badge/donate-liberapay-green)](https://liberapay.com/daiyam/donate)
[![Donation](https://img.shields.io/badge/donate-paypal-green)](https://paypal.me/daiyam99)

> Sanitize filesystem paths and path segments to prevent directory traversal, invalid characters, and reserved names.

Features
--------

- Prevent directory traversal and unsafe path resolution
- Remove or replace invalid, restricted, or control characters
- Configurable `Sanitizer` with replace/empty listeners for custom behavior
- Small package with ESM and CJS builds

Installation
------------

```bash
npm add @zokugun/fs-path-sanitize
```

Examples
--------

### 1. Validate before writing

Check safety first, then read the error if it fails.

```typescript
import { isSafePath, validatePath } from '@zokugun/fs-path-sanitize';

function demoValidatePosix(): void {
   const path = '/var/log/app:log';

   if(!isSafePath(path, 'universal')) {
      const result = validatePath(path, 'universal');

      console.log(result.error);

      return;
   }

   console.log('path is safe');
}
```

### 2. Sanitize a user path for Windows

Sanitize a filename and replace illegal characters with `_`.

```typescript
import { sanitizePath } from '@zokugun/fs-path-sanitize';

function demoSanitizeWindows(): void {
   const input = 'my file:report?.txt';
   const result = sanitizePath(input, {
      target: 'windows.safe',
      replacement: '_'
   });

   if(result.fails) {
      console.log('sanitize failed');
      console.log(result.error);

      return;
   }

   console.log(result.value);
}
```

### 3. Customize sanitization with listeners

Use `ReplaceHandler` and `EmptyHandler` to control leading, trailing and empty results.

```typescript
import { EmptyHandler, ReplaceHandler, Sanitizer } from '@zokugun/fs-path-sanitize';

function demoCustomSanitize(): void {
   const sanitizer = new Sanitizer({
      target: 'windows.fat32',
      replacement: '-',
      onLeading: ReplaceHandler.addLeadingUnderscore,
      onTrailing: ReplaceHandler.addTrailingUnderscore,
      onEmpty: EmptyHandler.addReplacement
   });
   const segment = '  .con';
   const output = sanitizer.sanitizeSegment(segment);

   console.log(output);
}
```

API reference
-------------

### Validation

Use these functions to determine if a path or segment is safe for a given target.

#### `isSafePath(path: string, target?: Target | 'auto'): boolean`

Checks if the entire path is safe. Returns `true` if no violations are found.

- `path`: The path string to check.
- `target`: The filesystem target (e.g., `'windows.ntfs'`, `'posix'`). Use `'auto'` to detect the current OS automatically.

#### `isSafeSegment(segment: string, target?: Target | 'auto'): boolean`

Checks if a single path segment is safe.

#### `validatePath(path: string, target?: Target | 'auto'): Result<string, string>`

Validates the path. Returns a result indicating success or the specific reason for failure.

#### `validateSegment(segment: string, target?: Target | 'auto'): Result<string, string>`

Validates a single segment. Returns a result indicating success or failure.

### Sanitization

Use these functions to remove or replace unsafe characters and keywords.

#### `sanitizePath(path: string, options: {...}): Result<string, string>`

Cleans a path based on the target rules.

- `path`: The string path to sanitize.
- `options`: An object containing:
   - `absolute?: boolean`: Whether the path is absolute.
   - `parent?: string | null`: Parent directory path.
   - `replacement?: string | null`: String to use as a replacement for invalid characters.
   - `resolve?: Resolver | null`: A resolver function to handle path logic.
   - `target?: Target | 'auto'`: The filesystem target or `'auto'`.

> [!WARNING]
>
> `sanitizePath` removes dangerous characters, but it does not guarantee the resulting string is safe for shell execution without further quoting or escaping.
>
> By default, relative paths are allowed and `.` / `..` segments are preserved.<br />
> Set `absolute: true` to reject these segments.<br />
> Alternatively, provide `resolve` to transform the path before sanitization. `.` / `..` segments in the resolved path are then rejected.

#### `sanitizeSegment(segment: string, options: {...}): string`

Cleans a single segment.

- `path`: The string segment to sanitize.
- `options`: An object containing:
   - `replacement?: string | null`: String to use as a replacement for invalid characters.
   - `target?: Target | 'auto'`: The filesystem target or `'auto'`.

### Class: `Sanitizer`

The underlying engine. The standalone functions use this class internally via the singleton `getInstance`.<br />
You can instantiate it directly if you need persistent configuration or advanced listeners.

```ts
class Sanitizer {
   static getInstance(target: Target): Sanitizer
   constructor(options: {
      additionalKeywords?: RegExp[] | null;
      maxLength?: number | null;
      minLength?: number | null;
      onEmpty?: EmptyListener | null;
      onKeyword?: ReplaceListener | null;
      onLeading?: ReplaceListener | null;
      onTrailing?: ReplaceListener | null;
      replacement?: string | null;
      target?: Target | null;
   })
   isSafePath(path: string): boolean
   isSafeSegment(segment: string): boolean
   sanitizePath(path: string, options?: { absolute?: boolean; replacement?: string | null; resolve?: Resolver | null }): Result<string, string>
   sanitizeSegment(segment: string, options?: { replacement?: string | null }): string
   validatePath(path: string): Result<string, string>
   validateSegment(segment: string): Result<string, string>
}
```

### Types

#### Target

A union of strings representing specific filesystem configurations:

| Target                  | Purpose                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| `posix`                 | Unix-style filename rules for POSIX systems and utilities. Very very strict.    |
| `universal`             | Cross-platform safe preset that combines Linux, macOS and Windows restrictions. |
| `linux.safe`            | Linux safe preset.                                                              |
| `macos.safe`            | macOS safe preset; covering common HFS/APFS restrictions.                       |
| `windows.safe`          | Windows safe preset; combining FAT32/NTFS restrictions for compatibility.       |
| `linux.esc.ansic`       | Linux preset; safe only and only if it's escaped with ANSI-C quoting            |
| `linux.esc.single`      | Linux preset; safe only and only if it's escaped with single quotes             |
| `macos.apfs.safe`       | APFS-safe.                                                                      |
| `macos.apfs.esc.ansic`  | APFS preset; safe only and only if it's escaped with ANSI-C quoting             |
| `macos.apfs.esc.single` | APFS preset; safe only and only if it's escaped with single quotes              |
| `macos.hfs.safe`        | HFS-safe.                                                                       |
| `macos.hfs.esc.ansic`   | HFS preset; safe only and only if it's escaped with ANSI-C quoting              |
| `macos.hfs.esc.single`  | HFS preset; safe only and only if it's escaped with single quotes               |
| `windows.exfat`         | exFAT safe preset                                                               |
| `windows.fat32`         | FAT32 safe preset                                                               |
| `windows.ntfs`          | NTFS safe preset                                                                |


##### Shell Targets

- `*.esc.ansic`: allows the path (`file\nname.txt`) in `touch $'file\nname.txt'` to be considered safe.
- `*.esc.single`: allows the path (`*file.txt`) in `touch '*file.txt'` or `touch \*file.txt` to be considered safe.

#### Resolver

```typescript
type Resolver = ((path: string) => string) | ((path: string, separator: string) => string);
```

A function used to resolve or transform a path before it is sanitized.

#### Listeners

These types define how the sanitizer handles replacements.

```typescript
// Returns a string when a segment becomes empty.
type EmptyListener = (replacement: string) => string

// Determines the replacement string based on the match and current replacement value.
type ReplaceListener = (args: ReplacerArray, replacement: string) => string
```

`EmptyHandler.addReplacement`, `addUnderscore`, `addExclamation`<br />
`ReplaceHandler.addLeadingExclamation`, `addTrailingUnderscore`, etc.

Use them as `onEmpty`, `onKeyword`, `onLeading`, `onTrailing` when constructing a `Sanitizer` directly.

Restricted Characters
---------------------

Below are the actual characters and simple rules enforced per target.

- `posix`: allows uppercase `A-Z`, lowercase `a-z`, digits `0-9`, underscore `_`, dot `.`, hyphen `-`.
- `universal`: combines Windows and POSIX restrictions. Disallows `"` `*` `:` `<` `>` `?` `|` `+` `,` `;` `=` `[` `]` `:` (colon), NUL (U+0000), control characters (U+0000–U+001F, U+007F), Unicode non-characters (U+FFF0–U+FFFF), various Unicode spaces (e.g. U+00A0, U+1680, U+2000–U+200A, U+202F, U+205F, U+3000), shell-special characters (space, `*`, `?`, `[`, `]`, `$`, `` ` ``, `"`, `'`, `|`, `&`, `;`, `<`, `>`), and relative path segments like `.`/`..`.
- `linux.safe`: disallows shell-special characters (space, `*`, `?`, `[`, `]`, `$`, `` ` ``, `"`, `'`, `|`, `&`, `;`, `<`, `>`), control characters, NUL, and relative path segments.
- `linux.esc.single`, `macos.*.esc.single`: disallows control characters and NUL.
- `linux.esc.ansic`, `macos.*.esc.ansic`: disallows NUL.
- `macos.hfs.safe`, `macos.safe`: disallows colon (`:`), shell-special characters, control characters, NUL, and relative segments. HFS historically reserves `:` as a separator.
- `macos.apfs.safe`: disallows shell-special characters, control characters, NUL, and relative segments.
- `windows.exfat`: disallows `"` `*` `:` `<` `>` `?` `|` and control characters (U+0000–U+001F, U+007F); rejects NUL and relative traversal sequences.
- `windows.fat32`, `windows.safe`: disallows `"` `*` `:` `<` `>` `?` `|` `+` `,` `;` `=` `[` `]`, control characters, leading spaces, trailing spaces or trailing dots, NUL, and relative traversal sequences.
- `windows.ntfs`: disallows `"` `*` `:` `<` `>` `?` `|`, NUL, control characters, certain Unicode non-characters; additionally checks reserved NTFS volume root names.

Restricted Keywords
-------------------

These names are rejected (case-insensitive) when the corresponding target enforces keyword rules.

- FAT32 reserved names (applies to `windows.fat32`, `windows.safe`, and `universal`):
    - `CON`, `PRN`, `AUX`, `NUL`
    - `COM1`..`COM9` (also superscript forms `COM¹`, `COM²`, `COM³`)
    - `LPT1`..`LPT9` (and superscript forms `LPT¹`, `LPT²`, `LPT³`)
    - `CLOCK$`, `CONIN$`, `CONOUT$`, `CONERR$`, `CONFIG$`
    - File extensions are ignored. So, `CON.txt` or `CON.tar.gz` are treated as `CON`.

- NTFS volume-root reserved names (applies to `windows.ntfs` and `universal`):
    - `$Mft`, `$MftMirr`, `$LogFile`, `$Volume`, `$AttrDef`, `$Bitmap`, `$Boot`, `$BadClus`, `$Secure`, `$Upcase`, `$Extend`, `$Quota`, `$ObjId`, `$Reparse`

Contributions
-------------

Contributions are most welcome. Please:
- Open issues and feature requests under the repository discussions.
- Follow the [`CONTRIBUTING.md`](./CONTRIBUTING.md).

Donations
---------

Support this project by becoming a financial contributor.

<table>
    <tr>
        <td><img src="https://raw.githubusercontent.com/daiyam/assets/master/icons/256/funding_kofi.png" alt="Ko-fi" width="80px" height="80px"></td>
        <td><a href="https://ko-fi.com/daiyam" target="_blank">ko-fi.com/daiyam</a></td>
    </tr>
    <tr>
        <td><img src="https://raw.githubusercontent.com/daiyam/assets/master/icons/256/funding_liberapay.png" alt="Liberapay" width="80px" height="80px"></td>
        <td><a href="https://liberapay.com/daiyam/donate" target="_blank">liberapay.com/daiyam/donate</a></td>
    </tr>
    <tr>
        <td><img src="https://raw.githubusercontent.com/daiyam/assets/master/icons/256/funding_paypal.png" alt="PayPal" width="80px" height="80px"></td>
        <td><a href="https://paypal.me/daiyam99" target="_blank">paypal.me/daiyam99</a></td>
    </tr>
</table>

License
-------

Copyright &copy; 2026-present Baptiste Augrain

Licensed under the [MIT license](https://opensource.org/licenses/MIT).
