# Digital Clutter & Security Risk Analyzer

**Digital Clutter & Security Risk Analyzer** is a professional Python desktop-style utility for analyzing folder storage, finding duplicate files, identifying old or unused items, and assessing security risk patterns in directories like `Downloads`, `Desktop`, `Documents`, or any custom path.

## Key Features

- Recursive folder scanning with file-by-file analytics
- Storage insights: total storage, average size, largest and smallest files
- File type breakdown with percentage distribution
- Duplicate detection by file name and file content using MD5 hashing
- Old file analysis for multiple aging thresholds
- Executable and security risk scoring based on suspicious patterns
- Intelligent cleanup recommendations and exportable report generation
- Scan history persistence in JSON
- Colorized terminal dashboard with light/dark theme support
- Robust error handling for invalid paths, permission issues, and corrupted files

## Project Structure

```
.digital_clutter_analyzer/
├── main.py
├── scanner.py
├── analyzer.py
├── duplicate_finder.py
├── security.py
├── recommendations.py
├── reports.py
├── models.py
├── utils.py
├── data/
│   └── scan_history.json
├── exports/
│   └── reports.json
└── README.md
```

## Installation

1. Clone or download the repository.
2. Install dependencies:

```bash
pip install colorama
```

3. Run the application:

```bash
python main.py
```

## Usage

- Choose `Scan Folder` to analyze a directory.
- Review the generated storage, duplicate, and security reports.
- Use `Export Latest Reports` to save JSON reports.
- Use `Scan History` to view and clear prior results.
- Switch between `Dark` and `Light` terminal themes.

## Why This Project is Portfolio-Ready

- Demonstrates OOP with clean class separation
- Uses real file system operations and recursive scanning
- Includes hashing, analytics, JSON persistence, and exception handling
- Features a professional CLI interface with visual themes
- Provides a real-world utility scenario for internship and entry-level roles

## Notes

This tool is designed to provide security risk insights, not to replace formal antivirus software.

---

Built with Python, `pathlib`, `datetime`, `hashlib`, `collections`, `json`, `typing`, and `colorama`.
