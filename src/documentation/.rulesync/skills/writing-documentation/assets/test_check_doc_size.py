"""Run with python3 -m unittest discover -s assets -p 'test_*.py'."""

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("check_doc_size.py")


class SizeCheckTests(unittest.TestCase):
    def run_check(self, *args):
        return subprocess.run(
            [sys.executable, str(SCRIPT), *map(str, args)],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )

    def check_text(self, text):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "document.md"
            path.write_text(text, encoding="utf-8")
            return self.run_check(path)

    def records(self, result):
        return [json.loads(line) for line in result.stdout.splitlines()]

    def test_default_boundaries(self):
        for words, state, exit_code in [
            (0, "green", 0),
            (2699, "green", 0),
            (2700, "yellow", 0),
            (2999, "yellow", 0),
            (3000, "red", 1),
            (3001, "red", 1),
        ]:
            with self.subTest(words=words):
                result = self.check_text("word " * words)
                self.assertEqual(result.returncode, exit_code, result.stderr)
                record, = self.records(result)
                self.assertEqual(record["words"], words)
                self.assertEqual(record["state"], state)
                if state == "green":
                    self.assertIsNone(record["message"])
                else:
                    self.assertTrue(record["message"])

    def test_count_is_independent_of_wrapping_and_supports_unicode(self):
        tokens = ["#", "Scope", "café", "日本語", "don't", "request-timeout", "```"]
        for separator in [" ", "\n", "\t", "\u2003"]:
            with self.subTest(separator=repr(separator)):
                result = self.check_text(separator.join(tokens))
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(self.records(result)[0]["words"], len(tokens))

    def test_multiple_files_and_custom_limits_fail_ci_on_red(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = [Path(directory) / f"document {i}.md" for i in range(3)]
            for path, words in zip(paths, [1, 2, 4]):
                path.write_text("word " * words, encoding="utf-8")
            result = self.run_check("--warn-at", 2, "--error-at", 4, *paths)
            self.assertEqual(result.returncode, 1, result.stderr)
            records = self.records(result)
            self.assertEqual([r["state"] for r in records], ["green", "yellow", "red"])
            self.assertEqual([r["words"] for r in records], [1, 2, 4])
            self.assertEqual([r["path"] for r in records], [str(p) for p in paths])

    def test_missing_file_does_not_hide_other_results(self):
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "missing.md"
            document = Path(directory) / "document.md"
            document.write_text("word " * 3000, encoding="utf-8")
            result = self.run_check(missing, document)
            self.assertEqual(result.returncode, 2)
            self.assertIn(str(missing), result.stderr)
            self.assertEqual(self.records(result)[0]["state"], "red")

    def test_invalid_utf8_and_directory_are_errors(self):
        with tempfile.TemporaryDirectory() as directory:
            bad = Path(directory) / "bad.md"
            bad.write_bytes(b"\xff")
            for path in [bad, Path(directory)]:
                with self.subTest(path=path):
                    result = self.run_check(path)
                    self.assertEqual(result.returncode, 2)
                    self.assertIn(str(path), result.stderr)
                    self.assertEqual(result.stdout, "")

    def test_invalid_thresholds_and_missing_paths_are_rejected(self):
        for args in [
            ["--warn-at", "0", "document.md"],
            ["--warn-at", "4", "--error-at", "4", "document.md"],
            ["--warn-at", "5", "--error-at", "4", "document.md"],
            ["--error-at", "invalid", "document.md"],
            [],
        ]:
            with self.subTest(args=args):
                result = self.run_check(*args)
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")


if __name__ == "__main__":
    unittest.main()
