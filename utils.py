import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

try:
    from colorama import Fore, Style, init
    init(autoreset=True)
except ImportError:
    class Fore:
        RED = ""
        GREEN = ""
        YELLOW = ""
        BLUE = ""
        MAGENTA = ""
        CYAN = ""
        WHITE = ""
        RESET = ""

    class Style:
        DIM = ""
        NORMAL = ""
        BRIGHT = ""
        RESET_ALL = ""

THEMES = {
    "dark": {
        "header": Fore.CYAN + Style.BRIGHT,
        "accent": Fore.MAGENTA,
        "warning": Fore.YELLOW,
        "danger": Fore.RED,
        "success": Fore.GREEN,
    },
    "light": {
        "header": Fore.BLUE + Style.BRIGHT,
        "accent": Fore.MAGENTA,
        "warning": Fore.YELLOW,
        "danger": Fore.RED,
        "success": Fore.GREEN,
    },
}

CURRENT_THEME = "dark"

def format_bytes(value: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(value)
    for unit in units:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} PB"

def style_reset() -> str:
    return getattr(Style, "RESET_ALL", "")


def safe_load_json(path: Path) -> Any:
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8") as stream:
            return json.load(stream)
    except (json.JSONDecodeError, OSError, IOError):
        return []

def safe_save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as stream:
        json.dump(data, stream, indent=2)

def theme_style(kind: str) -> str:
    return THEMES.get(CURRENT_THEME, THEMES["dark"]).get(kind, "")

def print_banner() -> None:
    header = theme_style("header")
    accent = theme_style("accent")
    print(header + "=" * 80)
    print(header + "DIGITAL CLUTTER & SECURITY ANALYZER".center(80))
    print(header + "=" * 80)
    print(accent + "Built for smart folder auditing, duplicate detection, security scanning, and cleanup guidance.".center(80))
    print(header + "=" * 80)

def print_menu(options: List[str]) -> None:
    print(theme_style("accent") + "Menu:"
          + Style.RESET_ALL)
    for index, option in enumerate(options, start=1):
        print(f"  {theme_style('success')}{index}. {theme_style('header')}{option}")
    print()

def print_section(title: str) -> None:
    print(theme_style("accent") + f"\n{title}" + theme_style("accent") + "\n" + "-" * len(title))

def load_theme() -> str:
    env_theme = os.environ.get("DCA_THEME")
    if env_theme in THEMES:
        return env_theme
    return CURRENT_THEME
