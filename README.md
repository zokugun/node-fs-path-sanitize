[@zokugun/fs-path-sanitize](https://github.com/zokugun/node-fs-path-sanitize)
==========================================================

[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![NPM Version](https://img.shields.io/npm/v/@zokugun/fs-path-sanitize.svg?colorB=green)](https://www.npmjs.com/package/@zokugun/fs-path-sanitize)
[![Donation](https://img.shields.io/badge/donate-ko--fi-green)](https://ko-fi.com/daiyam)
[![Donation](https://img.shields.io/badge/donate-liberapay-green)](https://liberapay.com/daiyam/donate)
[![Donation](https://img.shields.io/badge/donate-paypal-green)](https://paypal.me/daiyam99)

> Sanitize filesystem paths and path segments to prevent directory traversal, invalid characters, and reserved names. Lightweight and compatible with both ESM and CommonJS.

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

Quick Start
-----------

```ts
import { sanitizePath, sanitizeSegment } from '@zokugun/fs-path-sanitize';

console.log(sanitizePath('../etc/passwd')); // sanitized, safe path
console.log(sanitizeSegment('con\0'));    // sanitized segment
```

API reference
-------------

- `isSafePath(path: string, target?: Target | 'auto'): boolean`: Check if a path is safe.
- `isSafeSegment(segment: string, target?: Target | 'auto'): boolean`: Check if a single path segment is safe.
- `sanitizePath(path: string, options?: { absolute?: boolean; parent?: string | null; replacement?: string | null; resolve?: Resolver | null; target?: Target | 'auto' }): DResult<string>`: Sanitize a path and return a result or error.
- `sanitizeSegment(segment: string, options?: { replacement?: string | null; target?: Target | 'auto' }): string`: Sanitize a single segment.
- `validatePath(path: string, target?: Target | 'auto'): DResult<string>`: Validate a path; returns `ok(path)` or `err(message)`.
- `validateSegment(segment: string, target?: Target | 'auto'): DResult<string>`: Validate a segment; returns `ok(segment)` or `err(message)`.
- `Sanitizer`: Class. Obtain with `Sanitizer.getInstance(target: Target)`. Instance methods: `isSafePath`, `isSafeSegment`, `sanitizePath`, `sanitizeSegment`, `validatePath`, `validateSegment`.
- Types and handlers:
    - `Target`: supported target strings (see src/target.ts).
    - `Resolver`: `(path: string) => string` or `(path: string, separator: string) => string`.
    - `ReplaceListener`, `EmptyListener`: listener function types. Default handlers: `ReplaceHandler`, `EmptyHandler`.

Targets
-------

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

Shell Targets
-------------

- `*.esc.ansic`: allows the file (`file\nname.txt`) in `touch $'file\nname.txt'` to be considered safe.
- `*.esc.single`: allows the file (`*file.txt`) in `touch '*file.txt'` or `touch \*file.txt` to be considered safe.

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
