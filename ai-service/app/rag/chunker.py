"""
Deterministic Markdown Chunker for FIXXY Knowledge Base.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class DocumentChunk:
    """Represents a discrete semantic chunk of a knowledge document."""

    doc_id: str
    chunk_index: int
    title: str
    content: str


def load_markdown_file(file_path: Path | str) -> tuple[str, str, str]:
    """
    Load a markdown file and extract:
    (doc_id, main_title, raw_content)
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Knowledge file not found at: {path}")

    doc_id = path.stem.lower()
    raw_content = path.read_text(encoding="utf-8")

    # Extract main title from first H1 if present
    match = re.search(r"^#\s+(.+)$", raw_content, re.MULTILINE)
    main_title = match.group(1).strip() if match else doc_id.replace("_", " ").title()

    return doc_id, main_title, raw_content


def chunk_markdown(
    doc_id: str,
    raw_content: str,
    main_title: str = "",
    target_chunk_size: int = 600,
    overlap: int = 100,
) -> list[DocumentChunk]:
    """
    Deterministically chunk markdown text by semantic section headers (##, ###)
    and paragraph boundaries.
    """
    # Split by level-2 or level-3 markdown headers
    section_pattern = r"(^#{2,3}\s+[^\n]+)"
    parts = re.split(section_pattern, raw_content, flags=re.MULTILINE)

    sections: list[tuple[str, str]] = []

    # If first part has preamble text before the first ## / ### header
    if parts and not parts[0].startswith("##"):
        preamble = parts[0].strip()
        # Remove top-level # H1 title line if present
        clean_preamble = re.sub(r"^#\s+[^\n]+\n*", "", preamble).strip()
        if clean_preamble:
            sections.append((main_title or "Overview", clean_preamble))
        parts = parts[1:]

    # Iterate in pairs of (header, content)
    for i in range(0, len(parts), 2):
        header_text = parts[i].lstrip("#").strip()
        body_text = parts[i + 1].strip() if i + 1 < len(parts) else ""
        if body_text:
            sections.append((header_text, body_text))

    chunks: list[DocumentChunk] = []
    chunk_idx = 0

    for header, body in sections:
        # Paragraph split within the section
        paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
        current_chunk_text = ""

        for para in paragraphs:
            combined = (f"{current_chunk_text}\n\n{para}" if current_chunk_text else para).strip()
            if len(combined) <= target_chunk_size:
                current_chunk_text = combined
            else:
                if current_chunk_text:
                    formatted_content = f"### {header}\n\n{current_chunk_text}"
                    chunks.append(
                        DocumentChunk(
                            doc_id=doc_id,
                            chunk_index=chunk_idx,
                            title=header,
                            content=formatted_content,
                        )
                    )
                    chunk_idx += 1
                current_chunk_text = para

        if current_chunk_text:
            formatted_content = f"### {header}\n\n{current_chunk_text}"
            chunks.append(
                DocumentChunk(
                    doc_id=doc_id,
                    chunk_index=chunk_idx,
                    title=header,
                    content=formatted_content,
                )
            )
            chunk_idx += 1

    return chunks


def load_and_chunk_all(knowledge_dir: Path | str) -> list[DocumentChunk]:
    """Load and chunk all markdown files in a knowledge directory."""
    directory = Path(knowledge_dir)
    all_chunks: list[DocumentChunk] = []
    if not directory.exists():
        return all_chunks

    for md_file in sorted(directory.glob("*.md")):
        doc_id, title, raw = load_markdown_file(md_file)
        chunks = chunk_markdown(doc_id, raw, main_title=title)
        all_chunks.extend(chunks)

    return all_chunks
