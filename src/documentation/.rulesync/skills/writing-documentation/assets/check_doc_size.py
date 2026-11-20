#!/usr/bin/env python3
"""Count whitespace-delimited words and emit one JSON record per document."""

import argparse
import json
from pathlib import Path
import sys


WARN_AT = 2700
ERROR_AT = 3000
MESSAGES = {
    "green": None,
    "yellow": "Assess scope and growth internally; prefer green, but coherent yellow is valid. No routine user warning is needed.",
    "red": "Stop documentation work and propose a user-approved split; do not finish in red.",
}


def main(argv=None):
    parser = argparse.ArgumentParser(
        description=(
            "Check UTF-8 documents by word count. Counts all whitespace-delimited "
            "tokens, including Markdown, frontmatter, and code. No Markdown parsing. "
            "Outputs JSON Lines. Exit 0: green/yellow; 1: any red; 2: input error."
        ),
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--warn-at", type=int, default=WARN_AT, help="Yellow starts at this word count")
    parser.add_argument("--error-at", type=int, default=ERROR_AT, help="Red starts at this word count")
    parser.add_argument("paths", nargs="+", help="Document paths; use - once for UTF-8 standard input")
    args = parser.parse_args(argv)
    if not 0 < args.warn_at < args.error_at:
        parser.error("thresholds must satisfy 0 < --warn-at < --error-at")
    if args.paths.count("-") > 1:
        parser.error("standard input (-) can only be read once")

    exit_code = 0
    for path in args.paths:
        try:
            if path == "-":
                if sys.stdin is None:
                    raise OSError("standard input is unavailable")
                sys.stdin.reconfigure(encoding="utf-8")
                words = sum(len(line.split()) for line in sys.stdin)
            else:
                with Path(path).open(encoding="utf-8") as source:
                    words = sum(len(line.split()) for line in source)
        except (OSError, UnicodeError) as error:
            print(f"{path}: {error}", file=sys.stderr)
            exit_code = 2
            continue

        state = "red" if words >= args.error_at else "yellow" if words >= args.warn_at else "green"
        print(json.dumps({"path": path, "state": state, "words": words, "message": MESSAGES[state]}))
        if state == "red" and exit_code == 0:
            exit_code = 1
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
