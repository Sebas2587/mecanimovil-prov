#!/usr/bin/env python3
"""Fix imports broken when InstitutionalIcon lines were inserted inside multiline `import {`."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
MARK_INST = "import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';"
MARK_SW = "import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';"
BAD = f"import {{\n{MARK_INST}\n{MARK_SW}\n"


def skip_leading_junk(i: int, lines: list[str]) -> int:
    n = len(lines)
    while i < n:
        s = lines[i].strip()
        if s == "" or s.startswith("//"):
            i += 1
            continue
        if s.startswith("/*"):
            while i < n and "*/" not in lines[i]:
                i += 1
            i += 1
            continue
        return i
    return i


def end_of_import_block(lines: list[str], start: int) -> int:
    i = start
    n = len(lines)
    while i < n:
        if lines[i].rstrip().endswith(";"):
            return i + 1
        i += 1
    return n


def last_import_end(lines: list[str]) -> int:
    i = 0
    insert_at = 0
    n = len(lines)
    while True:
        i = skip_leading_junk(i, lines)
        if i >= n or not lines[i].startswith("import "):
            break
        insert_at = end_of_import_block(lines, i)
        i = insert_at
    return insert_at


def strip_mark_lines(lines: list[str]) -> list[str]:
    return [ln for ln in lines if ln.strip() not in (MARK_INST, MARK_SW)]


def main() -> None:
    for p in ROOT.rglob("*.tsx"):
        text = p.read_text(encoding="utf-8")
        if BAD not in text and MARK_INST not in text:
            continue
        fixed = text.replace(BAD, "import {\n", 1)
        lines = strip_mark_lines(fixed.split("\n"))
        pos = last_import_end(lines)
        if MARK_INST in "\n".join(lines):
            p.write_text("\n".join(lines), encoding="utf-8")
            print("skip-already", p.relative_to(ROOT))
            continue
        out = "\n".join(lines[:pos] + [MARK_INST, MARK_SW] + lines[pos:])
        p.write_text(out, encoding="utf-8")
        print("fixed", p.relative_to(ROOT))


if __name__ == "__main__":
    main()
