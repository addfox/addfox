# README Generator Skill

A Claude AI skill that generates comprehensive, best-practice README.md files for GitHub repositories.

## Overview

This skill automates the creation of professional README files that follow GitHub best practices. It's particularly optimized for MkDocs-based intelligent textbook projects but can be adapted for any repository type.

## Features

- **Automatic Badge Generation**: Detects technologies and generates appropriate shields.io badges
- **Site Metrics Collection**: Gathers comprehensive statistics about content, structure, and resources
- **GitHub Best Practices**: Follows recommended README structure and formatting
- **Intelligent Detection**: Automatically identifies project type, dependencies, and deployment status
- **Validation Tools**: Includes scripts to validate README quality and completeness

## What Gets Generated

The skill creates a README with these sections:

1. **Badges** - Technology, platform, status, and license badges
2. **Live Site Link** - Prominent link to deployed site (if applicable)
3. **Overview** - Compelling 1-3 paragraph project description
4. **Site Status and Metrics** - Comprehensive project statistics
5. **Getting Started** - Clear installation and usage instructions
6. **Repository Structure** - ASCII tree with explanations
7. **Reporting Issues** - GitHub issues link and guidelines
8. **License** - Clear licensing terms and attribution requirements
9. **Acknowledgements** - Open source community recognition
10. **Contact** - Maintainer information and communication channels

## Usage

Invoke the skill from Claude Code:

```
Use the readme-generator skill to create a README.md for this repository
```

The skill will:
1. Analyze the repository structure
2. Detect technologies and dependencies
3. Collect site metrics
4. Generate a comprehensive README.md
5. Validate the output

## Supporting Tools

### Metrics Collection Script

`scripts/collect-site-metrics.py` - Gathers statistics about:

- Markdown files and word counts
- Chapters and sections
- MicroSims and interactive elements
- Glossary terms, FAQs, quizzes
- Images and diagrams
- Learning graph metrics

**Usage:**
```bash
python scripts/collect-site-metrics.py /path/to/repo
```

**Output:** JSON object with all metrics

### Validation Script

`scripts/validate-readme.py` - Validates README for:

- Required sections present
- Valid links and URLs
- Proper markdown formatting
- Badge correctness
- Header structure

**Usage:**
```bash
python scripts/validate-readme.py README.md
```

**Output:** Validation report with score (0-100)

## Reference Documentation

### Badge Reference

`references/badges.md` - Comprehensive guide to:

- Common technology badges
- License badges
- Status and custom badges
- Badge formatting best practices
- Color and logo options

## File Structure

```
readme-generator/
├── SKILL.md                      # Skill definition and workflow
├── README.md                     # This file
├── scripts/
│   ├── collect-site-metrics.py  # Metrics collection
│   └── validate-readme.py       # README validation
└── references/
    └── badges.md                 # Badge reference guide
```

## Customization

The skill can be customized for different project types:

- **Textbooks**: Emphasizes educational metrics (concepts, chapters, quizzes)
- **Software Libraries**: Focuses on API documentation and examples
- **Applications**: Highlights features and deployment information
- **Documentation Sites**: Emphasizes content structure and navigation

## Requirements

- Python 3.8+ (for scripts)
- Access to repository files
- Git repository (for repository URL detection)

## Examples

See the generated README.md in the parent repository for a real-world example.

## License

MIT License - Feel free to use and adapt for your projects.

## Contributing

Improvements and suggestions welcome! Areas for enhancement:

- Additional badge templates
- Support for more project types
- Enhanced metrics collection
- Link validation (check if URLs are accessible)
- Screenshot generation

## Credits

Part of the [Claude Skills](https://github.com/dmccreary/claude-skills) collection for building intelligent textbooks.
