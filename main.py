try:
    import curses
except ImportError:
    curses = None

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional

from analyzer import StorageAnalyzer
from duplicate_finder import DuplicateFinder
from models import FileRecord
from recommendations import CleanupAdvisor
from reports import ReportGenerator
from scanner import FileScanner
from security import SecurityAnalyzer
import utils

SCAN_HISTORY_PATH = Path("data/scan_history.json")
EXPORT_DIR = Path("exports")


def main() -> None:
    utils.CURRENT_THEME = utils.load_theme()
    while True:
        utils.print_banner()
        utils.print_menu([
            "Scan Folder",
            "View Analytics Dashboard",
            "Scan History",
            "Export Latest Reports",
            "Clear Duplicate Files",
            "Scan for Malware and Risk Items",
            "Switch Theme",
            "Exit",
        ])

        choice = input(utils.theme_style("success") + "Select an option [1-8]: " + utils.style_reset())
        if choice == "1":
            run_scan_flow()
        elif choice == "2":
            display_dashboard()
        elif choice == "3":
            browse_history()
        elif choice == "4":
            export_latest_reports()
        elif choice == "5":
            delete_duplicates_with_confirmation()
        elif choice == "6":
            clear_risk_items_with_confirmation()
        elif choice == "7":
            switch_theme()
        elif choice == "8":
            print(utils.theme_style("header") + "Exiting Digital Clutter & Security Analyzer.")
            sys.exit(0)
        else:
            print(utils.theme_style("danger") + "Invalid option. Please select a number between 1 and 8.")
        input(utils.theme_style("accent") + "\nPress Enter to continue...")


def get_existing_default_path(home: Path, folder_name: str) -> Path:
    candidates = [home / folder_name]
    candidates.append(home / "OneDrive" / folder_name)
    candidates.append(home / "OneDrive - Personal" / folder_name)
    candidates.append(home / f"OneDrive - {home.name}" / folder_name)

    for path in home.glob("OneDrive*"):
        if path.is_dir():
            candidates.append(path / folder_name)

    for candidate in candidates:
        if candidate.exists():
            return candidate
    return home / folder_name


def get_scan_path() -> Path:
    home = Path.home()
    choices = {
        "1": get_existing_default_path(home, "Downloads"),
        "2": get_existing_default_path(home, "Desktop"),
        "3": get_existing_default_path(home, "Documents"),
        "4": None,
    }
    print(utils.theme_style("header") + "Select a folder to scan:")
    print(utils.theme_style("success") + f"  1. Downloads ({choices['1']})")
    print(utils.theme_style("success") + f"  2. Desktop ({choices['2']})")
    print(utils.theme_style("success") + f"  3. Documents ({choices['3']})")
    print(utils.theme_style("success") + "  4. Custom Path")
    selection = input(utils.theme_style("success") + "Choose 1-4: " + utils.style_reset())
    if selection in choices and choices[selection] is not None:
        path = choices[selection]
        if not path.exists():
            raise FileNotFoundError(f"Path does not exist: {path}")
        return path
    if selection == "4":
        custom = input(utils.theme_style("success") + "Enter folder path: " + utils.style_reset()).strip()
        path = Path(custom).expanduser().resolve()
        if not path.exists():
            raise FileNotFoundError(f"Path does not exist: {path}")
        return path
    raise ValueError("Invalid folder selection.")


def run_scan_flow() -> None:
    try:
        target_path = get_scan_path()
        scanner = FileScanner(str(target_path))
        files = scanner.scan_folder()
        display_scan_summary(files, target_path, scanner)
        save_scan_history(target_path, files, scanner)
    except FileNotFoundError as exc:
        print(utils.theme_style("danger") + f"Error: {exc}")
    except NotADirectoryError as exc:
        print(utils.theme_style("danger") + f"Error: {exc}")
    except PermissionError:
        print(utils.theme_style("danger") + "Permission denied while scanning that folder.")
    except ValueError as exc:
        print(utils.theme_style("danger") + f"Error: {exc}")
    except Exception as exc:
        print(utils.theme_style("danger") + f"Unexpected error: {exc}")


def display_scan_summary(files: List[FileRecord], path: Path, scanner: FileScanner) -> None:
    analyzer = StorageAnalyzer(files)
    duplicate_finder = DuplicateFinder(files)
    security_analyzer = SecurityAnalyzer(files, path)
    cleanup_advisor = CleanupAdvisor(files)

    storage_total = analyzer.calculate_total_storage()
    duplicates_by_content = duplicate_finder.find_duplicate_content()
    wasted_space = duplicate_finder.calculate_wasted_space(duplicates_by_content)
    security_report = security_analyzer.generate_security_report()
    recommendations = cleanup_advisor.generate_recommendations(security_report)
    top_large = cleanup_advisor.identify_large_files(10)
    old_counts = get_old_file_counts(files)

    utils.print_section("SCAN SUMMARY")
    print(f"Folder: {path}")
    print(f"Files Scanned: {len(files)}")
    print(f"Folders Scanned: {scanner.folders_scanned}")
    print(f"Scan Duration: {scanner.scan_duration:.2f} seconds")
    print(f"Total Storage: {utils.format_bytes(storage_total)}")
    print(f"Average File Size: {utils.format_bytes(int(analyzer.average_file_size()))}")
    print(f"Duplicate Groups Found: {len(duplicates_by_content)}")
    print(f"Potential Savings: {utils.format_bytes(wasted_space)}")
    print(f"Security Risk Score: {security_report['security_score']} / 100")
    print(f"Risk Status: {security_report['risk_status']}")
    print(f"Malware Flags: {security_report.get('malware_flags', 0)}")

    utils.print_section("FILE TYPE BREAKDOWN")
    breakdown = analyzer.file_type_breakdown()
    for category, values in breakdown.items():
        print(f"{category.title():<12}: {values['count']} files ({values['percentage']}%)")

    utils.print_section("LARGEST FILES")
    for file in top_large:
        print(f"{file.name} — {utils.format_bytes(file.size)}")

    utils.print_section("OLD FILES")
    for label, count in old_counts.items():
        print(f"Files older than {label}: {count}")

    utils.print_section("SECURITY ANALYSIS")
    print(f"Suspicious Files: {security_report['suspicious_files']}")
    print(f"Hidden Executables: {security_report['hidden_executables']}")
    print(f"Duplicate Executables: {security_report['duplicate_executables']}")
    print(f"Large Unknown Files: {security_report['large_unknown_files']}")
    print(f"Old Executables: {security_report['old_executables']}")

    utils.print_section("CLEANUP RECOMMENDATIONS")
    for recommendation in recommendations[:8]:
        print(f"- {recommendation}")

    report_generator = ReportGenerator(path, files, {
        "folders_scanned": scanner.folders_scanned,
        "scan_duration": scanner.scan_duration,
        "storage_used": storage_total,
        "security_score": security_report["security_score"],
        "risk_status": security_report["risk_status"],
    })
    latest_reports = {
        "summary": report_generator.generate_summary_report(),
        "storage": {
            "total_storage": utils.format_bytes(storage_total),
            "type_breakdown": breakdown,
        },
        "security": security_report,
        "cleanup_recommendations": recommendations,
    }
    save_latest_scan_with_files(latest_reports, files)


def get_old_file_counts(files: List[FileRecord]) -> Dict[str, int]:
    thresholds = [30, 60, 90, 180, 365]
    counts: Dict[str, int] = {}
    today = datetime.now()
    for age in thresholds:
        cutoff = today - timedelta(days=age)
        counts[str(age)] = sum(1 for file in files if file.modified_date < cutoff)
    return counts


def save_scan_history(path: Path, files: List[FileRecord], scanner: FileScanner) -> None:
    history = utils.safe_load_json(SCAN_HISTORY_PATH)
    summary = {
        "scan_date": datetime.now().isoformat(),
        "scan_path": str(path),
        "files_scanned": len(files),
        "folders_scanned": scanner.folders_scanned,
        "storage_used": utils.format_bytes(StorageAnalyzer(files).calculate_total_storage()),
        "duplicates_found": len(DuplicateFinder(files).find_duplicate_content()),
        "security_score": SecurityAnalyzer(files, path).risk_score(),
    }
    history.insert(0, summary)
    history = history[:50]
    utils.safe_save_json(SCAN_HISTORY_PATH, history)
    print(utils.theme_style("success") + "Scan history saved.")


def browse_history() -> None:
    history = utils.safe_load_json(SCAN_HISTORY_PATH)
    if not history:
        print(utils.theme_style("warning") + "No scan history found.")
        return

    utils.print_section("SCAN HISTORY")
    for index, record in enumerate(history, start=1):
        print(f"{index}. {record['scan_date']} | {record['scan_path']} | Files: {record['files_scanned']} | Storage: {record['storage_used']} | Score: {record['security_score']}")

    print(utils.theme_style("accent") + "\n1. Delete history\n2. Return to main menu")
    choice = input(utils.theme_style("success") + "Choose an option: " + utils.style_reset())
    if choice == "1":
        utils.safe_save_json(SCAN_HISTORY_PATH, [])
        print(utils.theme_style("success") + "Scan history cleared.")


def export_latest_reports() -> None:
    if not Path("latest_report.json").exists():
        print(utils.theme_style("warning") + "No latest report available. Please run a scan first.")
        return
    try:
        with Path("latest_report.json").open("r", encoding="utf-8") as stream:
            latest = json.load(stream)
    except Exception:
        print(utils.theme_style("danger") + "Failed to load the latest report.")
        return

    export_dir = EXPORT_DIR
    export_dir.mkdir(parents=True, exist_ok=True)
    try:
        report_generator = ReportGenerator(Path("."), [], {})
        report_generator.export_json(latest, "report_export.json", export_dir)
        print(utils.theme_style("success") + f"Report exported to {export_dir / 'report_export.json'}")
    except Exception as exc:
        print(utils.theme_style("danger") + f"Export failed: {exc}")


def switch_theme() -> None:
    print(utils.theme_style("header") + "Available themes:")
    for index, theme in enumerate(utils.THEMES.keys(), start=1):
        print(f"  {index}. {theme.title()}")
    choice = input(utils.theme_style("success") + "Choose a theme: " + utils.style_reset())
    available = list(utils.THEMES.keys())
    if choice.isdigit() and 1 <= int(choice) <= len(available):
        utils.CURRENT_THEME = available[int(choice) - 1]
        print(utils.theme_style("success") + f"Theme switched to {utils.CURRENT_THEME}.")
    else:
        print(utils.theme_style("danger") + "Invalid theme selection.")


def safe_save_latest_scan(data: Dict[str, object]) -> None:
    try:
        with Path("latest_report.json").open("w", encoding="utf-8") as stream:
            json.dump(data, stream, indent=2)
    except Exception:
        pass


def save_latest_scan_with_files(data: Dict[str, object], files: List[FileRecord]) -> None:
    data["file_list"] = [file.to_dict() for file in files]
    safe_save_latest_scan(data)


def select_files_with_checkboxes(file_entries: List[tuple]) -> Optional[List[FileRecord]]:
    def _picker(stdscr):
        curses.curs_set(0)
        stdscr.keypad(True)
        selected = [False] * len(file_entries)
        current = 0

        while True:
            stdscr.erase()
            stdscr.addstr(0, 0, "Use arrow keys to move, SPACE to toggle selection, ENTER to confirm, Q to cancel.")
            for idx, (file, risk_tags) in enumerate(file_entries):
                mark = "[x]" if selected[idx] else "[ ]"
                prefix = ">" if idx == current else " "
                line = f"{prefix} {mark} {idx + 1}. {file.name} ({utils.format_bytes(file.size)}) - [{', '.join(risk_tags)}]"
                try:
                    stdscr.addstr(idx + 2, 0, line)
                except curses.error:
                    pass

            stdscr.refresh()
            key = stdscr.getch()

            if key in (curses.KEY_UP, ord('k')):
                current = (current - 1) % len(file_entries)
            elif key in (curses.KEY_DOWN, ord('j')):
                current = (current + 1) % len(file_entries)
            elif key == ord(' '):
                selected[current] = not selected[current]
            elif key in (10, 13):
                return [file for index, (file, _) in enumerate(file_entries) if selected[index]]
            elif key in (ord('q'), 27):
                return None

    if curses is None:
        return None

    try:
        return curses.wrapper(_picker)
    except Exception:
        return None


def select_files_with_numbers(file_entries: List[tuple]) -> Optional[List[FileRecord]]:
    selected_indexes = set()
    while True:
        print()
        print(utils.theme_style("accent") + "Use the checkbox-style selection below by toggling items with their numbers.")
        print(utils.theme_style("accent") + "Commands: ALL, NONE, DONE, CANCEL")
        for idx, (file, risk_tags) in enumerate(file_entries, 1):
            mark = "[x]" if idx - 1 in selected_indexes else "[ ]"
            print(f"{mark} {idx}. {file.name} ({utils.format_bytes(file.size)}) - [{', '.join(risk_tags)}]")

        selection = input(utils.theme_style("success") + "Selection: " + utils.style_reset()).strip().lower()
        if selection in {"", "cancel"}:
            return None
        if selection == "done":
            break
        if selection == "all":
            selected_indexes = set(range(len(file_entries)))
            continue
        if selection == "none":
            selected_indexes.clear()
            continue

        for part in selection.replace(" ", "").split(","):
            if not part:
                continue
            if part.isdigit():
                index = int(part) - 1
                if 0 <= index < len(file_entries):
                    if index in selected_indexes:
                        selected_indexes.remove(index)
                    else:
                        selected_indexes.add(index)

    if not selected_indexes:
        return None
    return [file for idx, (file, _) in enumerate(file_entries) if idx in selected_indexes]


def display_dashboard() -> None:
    if not Path("latest_report.json").exists():
        print(utils.theme_style("warning") + "No scan data available. Please run a scan first.")
        return

    try:
        with Path("latest_report.json").open("r", encoding="utf-8") as stream:
            report = json.load(stream)
    except Exception:
        print(utils.theme_style("danger") + "Failed to load the latest report.")
        return

    summary = report.get("summary", {})
    storage = report.get("storage", {})
    security = report.get("security", {})

    utils.print_section("DIGITAL CLUTTER DASHBOARD")
    print(f"Scan Path: {summary.get('scan_path', 'N/A')}")
    print(f"Scan Date: {summary.get('scan_date', 'N/A')}")
    print()
    print(utils.theme_style("header") + "Files & Storage:")
    print(f"  Files Scanned: {summary.get('files_scanned', 0)}")
    print(f"  Folders Scanned: {summary.get('folders_scanned', 0)}")
    print(f"  Storage Used: {summary.get('storage_used_bytes', 0)} bytes ({utils.format_bytes(summary.get('storage_used_bytes', 0))})")
    print()
    print(utils.theme_style("header") + "Duplicates & Waste:")
    storage_info = storage.get("storage", {})
    print(f"  Type Breakdown: {storage.get('type_breakdown', {})}")
    print()
    print(utils.theme_style("header") + "Security Status:")
    print(f"  Security Score: {security.get('security_score', 0)} / 100")
    print(f"  Risk Status: {utils.theme_style('danger') if security.get('security_score', 0) > 75 else utils.theme_style('warning') if security.get('security_score', 0) > 50 else utils.theme_style('success')}{security.get('risk_status', 'UNKNOWN')}")
    print(f"  Suspicious Files: {security.get('suspicious_files', 0)}")
    print(f"  Hidden Executables: {security.get('hidden_executables', 0)}")
    print(f"  Large Unknown Files: {security.get('large_unknown_files', 0)}")
    print(f"  Old Executables: {security.get('old_executables', 0)}")
    print(f"  Malware Flags: {security.get('malware_flags', 0)}")
    print()
    print(utils.theme_style("header") + "Recommendations:")
    recommendations = report.get("cleanup_recommendations", [])
    for rec in recommendations[:5]:
        print(f"  • {rec}")


def delete_duplicates_with_confirmation() -> None:
    if not Path("latest_report.json").exists():
        print(utils.theme_style("warning") + "No scan data available. Please run a scan first.")
        return

    try:
        with Path("latest_report.json").open("r", encoding="utf-8") as stream:
            report = json.load(stream)
    except Exception:
        print(utils.theme_style("danger") + "Failed to load the latest report.")
        return

    file_list = report.get("file_list", [])
    if not file_list:
        print(utils.theme_style("warning") + "No file data available. Please run a scan first.")
        return

    files = [FileRecord(Path(f["path"])) for f in file_list if Path(f["path"]).exists()]
    if not files:
        print(utils.theme_style("warning") + "No files found from the last scan.")
        return

    duplicate_finder = DuplicateFinder(files)
    duplicates_by_content = duplicate_finder.find_duplicate_content()

    if not duplicates_by_content:
        print(utils.theme_style("success") + "No duplicate files found!")
        return

    utils.print_section("DUPLICATE FILES DETECTED")
    total_duplicates = sum(len(group) - 1 for group in duplicates_by_content.values())
    total_wasted = duplicate_finder.calculate_wasted_space(duplicates_by_content)

    print(f"Found {len(duplicates_by_content)} duplicate groups containing {total_duplicates} duplicate files.")
    print(f"Total wasted space: {utils.format_bytes(total_wasted)}")
    print()

    for idx, (content_hash, files_group) in enumerate(list(duplicates_by_content.items())[:5], 1):
        print(f"{idx}. Duplicate Group:")
        sorted_files = sorted(files_group, key=lambda f: f.modified_date)
        for file_idx, file in enumerate(sorted_files, 1):
            status = "[KEEP]" if file_idx == 1 else "[DELETE]"
            print(f"   {status} {file.name} ({utils.format_bytes(file.size)})")
        print()

    print(utils.theme_style("warning") + "⚠ WARNING: This will permanently delete duplicate files (copies only, not originals).")
    confirm = input(utils.theme_style("danger") + "Are you absolutely sure? Type 'YES' to confirm: " + utils.style_reset()).strip().upper()

    if confirm != "YES":
        print(utils.theme_style("warning") + "Operation cancelled.")
        return

    deleted_count = 0
    deleted_size = 0

    for content_hash, files_group in duplicates_by_content.items():
        sorted_files = sorted(files_group, key=lambda f: f.modified_date)
        for file in sorted_files[1:]:
            try:
                file.path.unlink()
                deleted_count += 1
                deleted_size += file.size
                print(utils.theme_style("success") + f"Deleted: {file.name}")
            except Exception as exc:
                print(utils.theme_style("danger") + f"Failed to delete {file.name}: {exc}")

    print()
    print(utils.theme_style("success") + f"Operation complete! Deleted {deleted_count} files, recovered {utils.format_bytes(deleted_size)}.")


def clear_risk_items_with_confirmation() -> None:
    if not Path("latest_report.json").exists():
        print(utils.theme_style("warning") + "No scan data available. Please run a scan first.")
        return

    try:
        with Path("latest_report.json").open("r", encoding="utf-8") as stream:
            report = json.load(stream)
    except Exception:
        print(utils.theme_style("danger") + "Failed to load the latest report.")
        return

    file_list = report.get("file_list", [])
    if not file_list:
        print(utils.theme_style("warning") + "No file data available. Please run a scan first.")
        return

    files = [FileRecord(Path(f["path"])) for f in file_list if Path(f["path"]).exists()]
    if not files:
        print(utils.theme_style("warning") + "No files found from the last scan.")
        return

    scan_path = Path(report.get("summary", {}).get("scan_path", "."))
    security_analyzer = SecurityAnalyzer(files, scan_path)
    suspicious_files = security_analyzer.scan_suspicious_extensions()
    hidden_execs = security_analyzer.detect_hidden_executables()
    large_unknown = security_analyzer.detect_large_unknown_files()
    malware_files = security_analyzer.scan_malware_content()

    risk_map = {}
    for file in suspicious_files + hidden_execs + large_unknown + malware_files:
        risk_map[str(file.path)] = file
    all_risk_files = sorted(risk_map.values(), key=lambda file: file.name.lower())

    if not all_risk_files:
        print(utils.theme_style("success") + "No risk items found!")
        return

    utils.print_section("RISK ITEMS DETECTED")
    print(f"Found {len(all_risk_files)} potentially risky files:")
    print()

    file_entries = []
    for file in all_risk_files:
        risk_type = []
        if file in suspicious_files:
            risk_type.append("Executable")
        if file in hidden_execs:
            risk_type.append("Hidden")
        if file in large_unknown:
            risk_type.append("Large")
        if file in malware_files:
            risk_type.append("Malware")
        file_entries.append((file, risk_type))

    selected_files = select_files_with_checkboxes(file_entries)
    if curses is None or selected_files is None:
        if curses is None:
            print(utils.theme_style("warning") + "Interactive checkbox selection is unavailable on this platform.")
            print(utils.theme_style("warning") + "For keyboard-based selection, install windows-curses with: py -m pip install windows-curses")
        selected_files = select_files_with_numbers(file_entries)

    if not selected_files:
        print(utils.theme_style("warning") + "No files selected or selection cancelled. Operation cancelled.")
        return

    print()
    print(utils.theme_style("accent") + "Selected files to delete:")
    for file in selected_files:
        print(f"[x] {file.name} ({utils.format_bytes(file.size)})")
    print()
    print(utils.theme_style("warning") + "⚠ WARNING: This will permanently delete the selected risky files.")
    print(utils.theme_style("warning") + "Only the chosen files will be removed, and the tool will skip protected system locations.")
    confirm = input(utils.theme_style("danger") + "Type 'YES' to confirm deletion: " + utils.style_reset()).strip().upper()

    if confirm != "YES":
        print(utils.theme_style("warning") + "Operation cancelled.")
        return

    deleted_count = 0
    failed_count = 0

    for file in selected_files:
        if not security_analyzer.is_safe_to_delete(file):
            failed_count += 1
            print(utils.theme_style("danger") + f"Skipping protected or out-of-scan file: {file.name}")
            continue
        try:
            file.path.unlink()
            deleted_count += 1
            print(utils.theme_style("success") + f"Deleted: {file.name}")
        except Exception as exc:
            failed_count += 1
            print(utils.theme_style("danger") + f"Failed to delete {file.name}: {exc}")

    print()
    print(utils.theme_style("success") + f"Operation complete! Deleted {deleted_count} files ({failed_count} failed or skipped).")


if __name__ == "__main__":
    main()
