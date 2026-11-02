"""Verify the Notion-export handoff without loading speech engines or their secrets."""
import importlib.util
import json
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch


class MomongaExportTest(unittest.TestCase):
    def test_lines_are_passed_through_and_default_to_empty(self):
        spec = importlib.util.spec_from_file_location('guide_builder', Path(__file__).with_name('build.py'))
        builder = importlib.util.module_from_spec(spec)
        # NumPy belongs to the speech path, which this metadata-only check never calls.
        with patch.dict('sys.modules', {'numpy': types.ModuleType('numpy')}):
            spec.loader.exec_module(builder)
        fixture = [{'text': 'QA-JA', 'text_en': 'QA-EN'}]
        with tempfile.TemporaryDirectory() as directory:
            builder.ROOT = directory
            builder.write_guide({'momonga_lines': fixture}, [])
            result = json.loads((Path(directory) / 'guide.json').read_text())
            self.assertEqual(result['momonga_lines'], fixture)
            builder.write_guide({}, [])
            result = json.loads((Path(directory) / 'guide.json').read_text())
            self.assertEqual(result['momonga_lines'], [])


if __name__ == '__main__':
    unittest.main()
