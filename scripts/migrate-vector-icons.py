#!/usr/bin/env python3
"""One-off: replace @expo/vector-icons usage with InstitutionalIcon + ICON_STROKE_WIDTH."""
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKIP = {"components/ui/InstitutionalIcon.tsx"}


def strip_vector_imports(text: str) -> str:
    text = re.sub(
        r"^import\s+MaterialIcons\s+from\s+'@expo/vector-icons/MaterialIcons';\s*\n",
        "",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(r"^import\s+\{[^}]*\}\s+from\s+'@expo/vector-icons';\s*\n", "", text, flags=re.MULTILINE)
    return text


def last_import_line(lines: list[str]) -> int:
    last = -1
    for i, line in enumerate(lines):
        if line.startswith("import ") or line.startswith("import type "):
            last = i
        elif line.strip() == "":
            continue
        elif last >= 0:
            break
    return last


def add_inst_imports(text: str) -> str:
    if "from '@/components/ui/InstitutionalIcon'" in text:
        return text
    lines = text.split("\n")
    idx = last_import_line(lines)
    if idx < 0:
        idx = 0
    ins = [
        "import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';",
        "import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';",
    ]
    return "\n".join(lines[: idx + 1] + ins + lines[idx + 1 :])


def replace_components(text: str) -> str:
    text = text.replace("<MaterialIcons ", "<InstitutionalIcon ")
    text = text.replace("<MaterialIcons\n", "<InstitutionalIcon\n")
    text = text.replace("<Ionicons ", "<InstitutionalIcon ")
    text = text.replace("<Ionicons\n", "<InstitutionalIcon\n")
    text = text.replace("<MaterialCommunityIcons ", "<InstitutionalIcon ")
    text = text.replace("<MaterialCommunityIcons\n", "<InstitutionalIcon\n")
    return text


def inject_stroke(text: str) -> str:
    def repl(m: re.Match[str]) -> str:
        inner = m.group(1)
        if "strokeWidth" in inner:
            return m.group(0)
        return f"<InstitutionalIcon{inner} strokeWidth={{ICON_STROKE_WIDTH}} />"

    return re.sub(r"<InstitutionalIcon([\s\S]*?)/>", repl, text)


def main() -> None:
    for p in sorted(ROOT.rglob("*.tsx")):
        rel = str(p.relative_to(ROOT))
        if rel in SKIP:
            continue
        raw = p.read_text(encoding="utf-8")
        if "@expo/vector-icons" not in raw and "vector-icons/MaterialIcons" not in raw:
            continue
        nt = strip_vector_imports(raw)
        nt = replace_components(nt)
        nt = inject_stroke(nt)
        nt = add_inst_imports(nt)
        if nt != raw:
            p.write_text(nt, encoding="utf-8")
            print("updated", rel)


if __name__ == "__main__":
    main()
