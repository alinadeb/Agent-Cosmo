#!/usr/bin/env python3
"""
Split cosmo.system-prompt.md into a Copilot CLI-compatible skill tree:

    skills/cosmo/
    ├── SKILL.md                       # ≤ 30 KB — description, startup handshake,
    │                                   #  agent workflow (Phases 0-4), do-not list,
    │                                   #  and pointers into references/*.md
    └── references/
        ├── intake-procedure.md        # § B (was)
        ├── design-generation.md       # § C
        ├── audit-checklist.md         # § D
        ├── code-handoff.md            # § E
        ├── standards.md               # § F
        ├── components.md              # § G
        └── pattern-<name>.md × 15     # § H.1 through H.15

The main SKILL.md keeps the parts Cosmo must always have loaded (identity,
handshake, phase workflow, failure modes, do-not rules). Every other section
becomes a reference file the model can read on demand.

Run:
    python3 build-skill.py
"""

from __future__ import annotations

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "cosmo.system-prompt.md")
SKILL_DIR = os.path.join(HERE, "skills", "cosmo")
REF_DIR = os.path.join(SKILL_DIR, "references")


# --- Frontmatter (single-line description; matches WorkIQ style) ---
DESCRIPTION_ONE_LINE = (
    "Design-to-code agent for Microsoft Security portals. "
    "Turns a prompt, PRD, or Figma file into an SFE-compliant Figma design, then a compliance audit "
    "(WCAG 2.2 AA, RAI, content design, design language), then production-ready React/TypeScript code "
    "following Trust360UX conventions — with a human review gate at every phase. "
    "Activate for: designing UI/UX from prompts/PRDs/requirements, reading/generating/auditing Figma files, "
    "accessibility or RAI reviews, converting Figma to React, building Security Copilot surfaces "
    "(dashboards, wizards, output cards, prompt ribbons, FRE modals, feedback flows), or when the user "
    "says 'cosmo', 'SFE', '@sfe/react', 'design tokens', or 'design system'. "
    "On activation, greet briefly and ask what to build (or for a Figma link), then verify the three "
    "component sources (key catalog, Fluent Agent MCP, Figma Dev Mode MCP) silently before generating."
)


def read_source() -> str:
    with open(SRC, encoding="utf-8") as f:
        return f.read()


def split_by_sections(text: str) -> dict[str, tuple[str, str]]:
    """
    Split the source by top-level `## § X.` headers.

    Returns dict mapping section-letter → (heading_text, body).
    """
    # Match "## § X. Some title\n" as section start.
    pattern = re.compile(r"^## § ([A-Z])\.?\s*(.+?)$", re.MULTILINE)
    matches = list(pattern.finditer(text))
    sections: dict[str, tuple[str, str]] = {}
    for i, m in enumerate(matches):
        letter = m.group(1)
        title = m.group(2).strip()
        heading_line = m.group(0).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        if letter in sections:
            # Same letter appears more than once (e.g. § A = Startup handshake
            # AND Agent workflow). Concatenate so no content is dropped; keep
            # the first title.
            prev_title, prev_body = sections[letter]
            sections[letter] = (prev_title, f"{prev_body}\n\n{heading_line}\n\n{body}")
        else:
            sections[letter] = (title, body)
    return sections


def split_patterns(section_h_body: str) -> dict[str, tuple[str, str]]:
    """Split § H into individual patterns keyed by pattern-slug."""
    # Pattern headings look like: "### § H.n Pattern — <name>"
    pattern = re.compile(
        r"^### § H\.(\d+)\s+Pattern\s*—\s*(.+?)$",
        re.MULTILINE,
    )
    matches = list(pattern.finditer(section_h_body))
    out: dict[str, tuple[str, str]] = {}
    for i, m in enumerate(matches):
        title = m.group(2).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(section_h_body)
        body = section_h_body[start:end].strip()
        slug = "pattern-" + re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        # Deduplicate slugs — some titles share words
        base = slug
        j = 2
        while slug in out:
            slug = f"{base}-{j}"
            j += 1
        out[slug] = (title, body)
    return out


def rewrite_section_refs(body: str, mapping: dict[str, str]) -> str:
    """
    Rewrite in-body references like "§ B.Intake procedure" to point at
    references/*.md files that we're creating.
    """
    for letter, ref_file in mapping.items():
        # § B, § B.Intake procedure, § B (§ header), etc.
        for pat in [
            rf"§\s*{letter}\.[A-Za-z][^.,)\s]{{2,80}}",
            rf"§\s*{letter}(?![.a-zA-Z0-9])",
            rf"§§ for `[a-z-]+`",  # from build.py earlier
        ]:
            def repl(m):
                return f"§ {letter} (see `references/{ref_file}`)"
            body = re.sub(pat, repl, body, count=1)  # replace first occurrence per pattern to avoid double-nesting
    return body


def main() -> int:
    if not os.path.exists(SRC):
        print(f"Source not found: {SRC}", file=sys.stderr)
        return 1

    text = read_source()
    sections = split_by_sections(text)

    # Sections to promote to their own reference files
    reference_map = {
        "B": ("intake-procedure.md", "Intake procedure (Phase 1)"),
        "C": ("design-generation.md", "Design-generation procedure (Phase 2)"),
        "D": ("audit-checklist.md", "Audit checklist (Phase 3)"),
        "E": ("code-handoff.md", "Code-handoff procedure (Phase 4)"),
        "F": ("standards.md", "SFE UX standards reference"),
        # § G (baked-in component catalog) was removed in the 2.0 public build —
        # the connected Figma library's enabled-library assets are the only
        # component source, so there is no components.md reference to emit.
    }

    os.makedirs(REF_DIR, exist_ok=True)

    # Write § B–§ G references
    for letter, (filename, display_title) in reference_map.items():
        if letter not in sections:
            print(f"  ⚠ Section § {letter} missing from source; skipping.")
            continue
        title, body = sections[letter]
        path = os.path.join(REF_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"# {display_title}\n\n")
            f.write(f"*Reference file for the Cosmo skill. Read this when the user's request enters the corresponding phase.*\n\n")
            f.write(body)
            f.write("\n")
        print(f"  ✅ {path} ({os.path.getsize(path):,} bytes)")

    # § H — patterns — split further
    pattern_files: list[tuple[str, str]] = []  # (slug, title)
    if "H" in sections:
        _, h_body = sections["H"]
        patterns = split_patterns(h_body)
        for slug, (title, body) in patterns.items():
            path = os.path.join(REF_DIR, f"{slug}.md")
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"# Pattern — {title}\n\n")
                f.write("*Reference file for the Cosmo skill. Read this when the user's request matches this pattern (see § A.Phase 0 pattern-match).*\n\n")
                f.write(body)
                f.write("\n")
            pattern_files.append((slug, title))
        print(f"  ✅ {len(pattern_files)} pattern reference files")

    # Build the main SKILL.md — the parts that MUST be always-loaded
    # Always include: identity/mission, § A.Startup handshake, § A.Agent workflow,
    # § I.Global reminder, § J.Do NOT
    parts: list[str] = []
    # Quote the description so YAML parses colons/quotes safely.
    quoted_desc = DESCRIPTION_ONE_LINE.replace('\\', '\\\\').replace('"', '\\"')
    parts.append(f"---\nname: cosmo\ndescription: \"{quoted_desc}\"\n---\n\n")
    parts.append("# Cosmo — Design-to-Code Agent\n\n")
    parts.append(
        "You are **Cosmo**. You turn a prompt, PRD, or existing Figma file into: "
        "(1) a Figma design built from real components, "
        "(2) a compliance audit, and "
        "(3) production-ready React + TypeScript code — with a human review gate at every phase.\n\n"
        "This skill's core content (identity, startup handshake, phase workflow, failure modes, do-not rules) is loaded automatically when you activate. "
        "Detailed procedures and reference material live in `references/*.md` — read them on demand as each phase needs them.\n\n"
    )

    # Reference index (visible to the model so it knows what to load)
    parts.append("## Reference files (read on demand)\n\n")
    parts.append("| When you need… | Read this file |\n|---|---|\n")
    for letter, (filename, display_title) in reference_map.items():
        parts.append(f"| {display_title} | `references/{filename}` |\n")
    if pattern_files:
        parts.append(
            "| Any of the 15 UX patterns (Phase 0 delegation) | `references/pattern-<name>.md` — see the pattern table below |\n"
        )
    parts.append("\n")

    # § A — always inline
    if "A" in sections:
        _, a_body = sections["A"]
        # Rewrite any references inside § A to point at the new file layout
        for letter, (filename, _display) in reference_map.items():
            a_body = re.sub(
                rf"§\s*{letter}\.[A-Za-z][^.,)\s]{{2,80}}",
                lambda m, fn=filename: f"§ {m.group(0)[m.group(0).index('.'):]} (see `references/{fn}`)",
                a_body,
            )
            a_body = re.sub(
                rf"§\s*{letter}(?![.a-zA-Z0-9])",
                lambda m, fn=filename: f"`references/{fn}`",
                a_body,
            )
        parts.append("---\n\n## § A. Agent workflow (always loaded)\n\n")
        parts.append(a_body)
        parts.append("\n\n")

    # Pattern index — always inline so Phase 0 can match
    if pattern_files:
        parts.append("---\n\n## § H. Pattern reference index\n\n")
        parts.append(
            "When Phase 0 matches one of these UX patterns, load the corresponding reference file and follow its procedure "
            "instead of Cosmo's general Phases 1–4.\n\n"
        )
        parts.append("| Pattern | Reference file |\n|---|---|\n")
        for slug, title in pattern_files:
            parts.append(f"| {title} | `references/{slug}.md` |\n")
        parts.append("\n")

    # § I and § J — always inline
    for letter in ["I", "J"]:
        if letter in sections:
            title, body = sections[letter]
            parts.append(f"---\n\n## § {letter}. {title}\n\n{body}\n\n")

    skill_text = "".join(parts)
    skill_path = os.path.join(SKILL_DIR, "SKILL.md")
    with open(skill_path, "w", encoding="utf-8") as f:
        f.write(skill_text)
    print(f"  ✅ {skill_path} ({os.path.getsize(skill_path):,} bytes)")

    print(f"\nSkill tree written to: {SKILL_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
