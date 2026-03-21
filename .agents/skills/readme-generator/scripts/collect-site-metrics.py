#!/usr/bin/env python3
"""
Site Metrics Collection Script

Scans a repository and collects metrics for README generation including:
- Markdown file counts and word counts
- Chapter and section counts
- MicroSim counts
- Glossary, FAQ, quiz statistics
- Image and diagram counts
- Learning graph statistics

Usage:
    python collect-site-metrics.py [repo_path]

Output:
    JSON object with all collected metrics
"""

import os
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

def count_words_in_markdown(file_path: str) -> int:
    """Count words in a markdown file, excluding code blocks and front matter."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove YAML front matter
        content = re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, flags=re.DOTALL)

        # Remove code blocks
        content = re.sub(r'```.*?```', '', content, flags=re.DOTALL)
        content = re.sub(r'`[^`]+`', '', content)

        # Remove HTML comments
        content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)

        # Remove markdown links but keep text
        content = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', content)

        # Remove images
        content = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', '', content)

        # Count words
        words = content.split()
        return len(words)
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return 0

def count_list_items(file_path: str) -> int:
    """Count markdown list items in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Count unordered lists (-, *, +)
        unordered = len(re.findall(r'^\s*[-*+]\s+', content, flags=re.MULTILINE))
        # Count ordered lists (1., 2., etc.)
        ordered = len(re.findall(r'^\s*\d+\.\s+', content, flags=re.MULTILINE))

        return unordered + ordered
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return 0

def count_tables(file_path: str) -> int:
    """Count markdown tables in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Count table header separators (e.g., |---|---|)
        tables = len(re.findall(r'^\|?\s*[-:]+\s*\|', content, flags=re.MULTILINE))
        return tables
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return 0

def count_code_blocks(file_path: str) -> int:
    """Count code blocks in a markdown file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Count fenced code blocks
        code_blocks = len(re.findall(r'```', content)) // 2
        return code_blocks
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return 0

def count_equations(file_path: str) -> int:
    """Count LaTeX equations in a markdown file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Count display equations ($$...$$)
        display = len(re.findall(r'\$\$.*?\$\$', content, flags=re.DOTALL))
        # Count inline equations ($...$)
        inline = len(re.findall(r'(?<!\$)\$(?!\$)[^$]+\$(?!\$)', content))

        return display + inline
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return 0

def count_quiz_questions(file_path: str) -> int:
    """Count quiz questions in a quiz markdown file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Count question numbers (assumes format like "1.", "2.", etc. at start of line)
        questions = len(re.findall(r'^\d+\.\s+', content, flags=re.MULTILINE))

        # Alternative: count headers that start with numbers
        if questions == 0:
            questions = len(re.findall(r'^#+\s+\d+[\.)]?\s+', content, flags=re.MULTILINE))

        return questions
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return 0

def count_glossary_terms(file_path: str) -> int:
    """Count glossary terms (assumes level 4 headers)."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Count level 4 headers (####)
        terms = len(re.findall(r'^####\s+', content, flags=re.MULTILINE))
        return terms
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return 0

def count_faq_questions(file_path: str) -> int:
    """Count FAQ questions."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Count headers that end with question marks
        questions = len(re.findall(r'^#+\s+.*\?', content, flags=re.MULTILINE))

        # Alternative: count specific FAQ patterns
        if questions == 0:
            questions = len(re.findall(r'^#+\s+', content, flags=re.MULTILINE))

        return questions
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return 0

def count_references(file_path: str) -> int:
    """Count references in references file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Count numbered references or list items
        refs = len(re.findall(r'^\d+\.\s+', content, flags=re.MULTILINE))

        if refs == 0:
            # Count list items
            refs = len(re.findall(r'^\s*[-*+]\s+', content, flags=re.MULTILINE))

        return refs
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return 0

def get_learning_graph_metrics(repo_path: Path) -> Dict:
    """Extract learning graph metrics from learning-graph directory."""
    lg_path = repo_path / 'docs' / 'learning-graph'
    metrics = {
        'concepts': 0,
        'quality_score': None
    }

    # Try to read concept list
    concept_file = lg_path / 'concept-list.md'
    if not concept_file.exists():
        concept_file = lg_path / 'list-concepts.md'

    if concept_file.exists():
        try:
            with open(concept_file, 'r', encoding='utf-8') as f:
                content = f.read()
            # Count numbered list items
            concepts = re.findall(r'^\d+\.\s+', content, flags=re.MULTILINE)
            metrics['concepts'] = len(concepts)
        except Exception as e:
            print(f"Error reading concept list: {e}", file=sys.stderr)

    # Try to read quality metrics
    quality_file = lg_path / 'quality-metrics.md'
    if quality_file.exists():
        try:
            with open(quality_file, 'r', encoding='utf-8') as f:
                content = f.read()
            # Look for quality score
            match = re.search(r'quality score:?\s*(\d+)', content, re.IGNORECASE)
            if match:
                metrics['quality_score'] = int(match.group(1))
        except Exception as e:
            print(f"Error reading quality metrics: {e}", file=sys.stderr)

    return metrics

def collect_metrics(repo_path: str = '.') -> Dict:
    """Collect all site metrics from repository."""
    repo = Path(repo_path).resolve()
    docs_path = repo / 'docs'

    metrics = {
        'repository': {
            'path': str(repo),
            'name': repo.name
        },
        'content': {
            'markdown_files': 0,
            'total_words': 0,
            'chapters': 0,
            'list_items': 0,
            'tables': 0,
            'code_blocks': 0,
            'equations': 0
        },
        'learning_graph': {
            'concepts': 0,
            'quality_score': None
        },
        'interactive': {
            'microsims': 0,
            'quizzes': 0,
            'quiz_questions': 0
        },
        'resources': {
            'glossary_terms': 0,
            'faq_questions': 0,
            'references': 0
        },
        'media': {
            'images': 0,
            'png': 0,
            'jpg': 0,
            'svg': 0
        }
    }

    if not docs_path.exists():
        print(f"Warning: docs directory not found at {docs_path}", file=sys.stderr)
        return metrics

    # Count markdown files and aggregate statistics
    for md_file in docs_path.rglob('*.md'):
        metrics['content']['markdown_files'] += 1
        metrics['content']['total_words'] += count_words_in_markdown(str(md_file))
        metrics['content']['list_items'] += count_list_items(str(md_file))
        metrics['content']['tables'] += count_tables(str(md_file))
        metrics['content']['code_blocks'] += count_code_blocks(str(md_file))
        metrics['content']['equations'] += count_equations(str(md_file))

    # Count chapters
    chapters_path = docs_path / 'chapters'
    if chapters_path.exists():
        metrics['content']['chapters'] = len([d for d in chapters_path.iterdir() if d.is_dir()])

    # Count MicroSims
    sims_path = docs_path / 'sims'
    if sims_path.exists():
        metrics['interactive']['microsims'] = len([d for d in sims_path.iterdir()
                                                    if d.is_dir() and (d / 'index.md').exists()])

    # Count quizzes and questions
    for quiz_file in docs_path.rglob('quiz.md'):
        metrics['interactive']['quizzes'] += 1
        metrics['interactive']['quiz_questions'] += count_quiz_questions(str(quiz_file))

    # Count glossary terms
    glossary_file = docs_path / 'glossary.md'
    if glossary_file.exists():
        metrics['resources']['glossary_terms'] = count_glossary_terms(str(glossary_file))

    # Count FAQ questions
    faq_file = docs_path / 'faq.md'
    if faq_file.exists():
        metrics['resources']['faq_questions'] = count_faq_questions(str(faq_file))

    # Count references
    ref_file = docs_path / 'references.md'
    if ref_file.exists():
        metrics['resources']['references'] = count_references(str(ref_file))

    # Count images
    for ext in ['png', 'jpg', 'jpeg', 'svg', 'gif']:
        image_files = list(docs_path.rglob(f'*.{ext}'))
        count = len(image_files)
        metrics['media']['images'] += count
        if ext in ['jpg', 'jpeg']:
            metrics['media']['jpg'] += count
        elif ext in metrics['media']:
            metrics['media'][ext] = count

    # Get learning graph metrics
    lg_metrics = get_learning_graph_metrics(repo)
    metrics['learning_graph'] = lg_metrics

    return metrics

def format_metrics_table(metrics: Dict) -> str:
    """Format metrics as a markdown table."""
    table = "| Metric | Count |\n"
    table += "|--------|-------|\n"

    if metrics['learning_graph']['concepts'] > 0:
        table += f"| Concepts in Learning Graph | {metrics['learning_graph']['concepts']} |\n"

    if metrics['content']['chapters'] > 0:
        table += f"| Chapters | {metrics['content']['chapters']} |\n"

    table += f"| Markdown Files | {metrics['content']['markdown_files']} |\n"
    table += f"| Total Words | {metrics['content']['total_words']:,} |\n"

    if metrics['interactive']['microsims'] > 0:
        table += f"| MicroSims | {metrics['interactive']['microsims']} |\n"

    if metrics['resources']['glossary_terms'] > 0:
        table += f"| Glossary Terms | {metrics['resources']['glossary_terms']} |\n"

    if metrics['resources']['faq_questions'] > 0:
        table += f"| FAQ Questions | {metrics['resources']['faq_questions']} |\n"

    if metrics['interactive']['quiz_questions'] > 0:
        table += f"| Quiz Questions | {metrics['interactive']['quiz_questions']} |\n"

    if metrics['content']['equations'] > 0:
        table += f"| Equations | {metrics['content']['equations']} |\n"

    if metrics['media']['images'] > 0:
        table += f"| Images | {metrics['media']['images']} |\n"

    if metrics['resources']['references'] > 0:
        table += f"| References | {metrics['resources']['references']} |\n"

    return table

def main():
    """Main entry point."""
    repo_path = sys.argv[1] if len(sys.argv) > 1 else '.'

    print(f"Collecting metrics from: {repo_path}", file=sys.stderr)
    metrics = collect_metrics(repo_path)

    # Output JSON
    print(json.dumps(metrics, indent=2))

    # Also print formatted table to stderr for reference
    print("\n--- Formatted Table ---", file=sys.stderr)
    print(format_metrics_table(metrics), file=sys.stderr)

if __name__ == '__main__':
    main()
