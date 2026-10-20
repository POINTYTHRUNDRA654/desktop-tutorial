"""Tests for the bridge's offline voice (Piper) with the Windows built-in voice as fallback.

These call the bridge's real TTS code and the real piper.exe (skipped if setup_piper.ps1 has not been run).
They write only into a temp folder: never into the game or the MO2 mod folder.
Run:  python -m unittest discover -s tests -p "test_tts_piper.py"
"""
import io
import os
import sys
import tempfile
import unittest
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "bridge"))
import mossy_fo4_bridge as bridge  # noqa: E402

PIPER = ROOT / "runtime" / "piper" / "piper.exe"
HAVE_PIPER = PIPER.is_file() and (ROOT / "runtime/piper/voices/en_US-joe-medium.onnx").is_file()
XWMA = Path(r"E:\Steam\steamapps\common\Fallout 4\Tools\LipGen\LipGenerator\xWMAEncode.exe")


def wav_info(path: Path):
    with wave.open(str(path), "rb") as w:
        return w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes() / w.getframerate()


class TtsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = Path(self.tmp.name) / "npc_voice.wav"
        self.cfg = {"enable_tts": 1, "tts_engine": "piper"}
        self._saved = (bridge._get_tts_wav_path, bridge._load_f4ai_config)
        bridge._get_tts_wav_path = lambda: self.out
        bridge._load_f4ai_config = lambda: self.cfg
        bridge._noted.clear()

    def tearDown(self):
        bridge._get_tts_wav_path, bridge._load_f4ai_config = self._saved
        self.tmp.cleanup()

    @unittest.skipUnless(HAVE_PIPER, "run setup_piper.ps1 first")
    def test_piper_makes_real_game_ready_audio(self):
        self.assertTrue(bridge._generate_tts_wav_locked("Stay close. The glowing sea is no place for a wanderer.", "human"))
        rate, ch, width, secs = wav_info(self.out)
        self.assertEqual((rate, ch, width), (44100, 1, 2))
        self.assertGreater(secs, 2.0)
        import numpy as np
        with wave.open(str(self.out), "rb") as w:
            peak = int(np.abs(np.frombuffer(w.readframes(w.getnframes()), dtype="<i2")).max())
        self.assertGreater(peak, 3000, "audio is silent")

    @unittest.skipUnless(HAVE_PIPER, "run setup_piper.ps1 first")
    def test_the_old_cloud_setting_is_ignored_and_nothing_goes_online(self):
        self.cfg.update({"tts_engine": "edge-tts", "tts_voice": "en-US-GuyNeural"})
        self.assertTrue(bridge._generate_tts_wav_locked("The cloud voice is gone.", "human"))
        self.assertTrue(self.out.is_file())
        self.assertNotIn("edge_tts", sys.modules, "the cloud package must never be imported")
        self.assertIn("tts_edge_removed", bridge._noted)

    @unittest.skipUnless(HAVE_PIPER, "run setup_piper.ps1 first")
    def test_quotes_unicode_and_newlines_cannot_break_the_command(self):
        nasty = 'He said "stop" & ran; $(calc) \'now\'\nSecond line — with a dash and an é.'
        self.assertTrue(bridge._generate_tts_wav_locked(nasty, "human"))
        self.assertGreater(wav_info(self.out)[3], 2.0)

    @unittest.skipUnless(HAVE_PIPER, "run setup_piper.ps1 first")
    def test_robots_and_mutants_speak_slower_than_people(self):
        # Measured over 12 runs each: human 2.81 s, robot 2.94 s (+4.5%), super mutant 3.16 s (+12%), run-to-run
        # spread about 0.05 s. The robot gap is too close to the noise to assert on; the super mutant gap is not.
        line = "I have been walking this road for a very long time."
        mean = {}
        for race in ("human", "super mutant"):
            runs = []
            for _ in range(3):
                self.assertTrue(bridge._generate_tts_wav_locked(line, race))
                runs.append(wav_info(self.out)[3])
            mean[race] = sum(runs) / len(runs)
        self.assertGreater(mean["super mutant"], mean["human"] * 1.05, mean)

    @unittest.skipUnless(HAVE_PIPER, "run setup_piper.ps1 first")
    def test_a_second_voice_can_be_chosen_in_config(self):
        self.cfg["tts_voice"] = "en_US-ljspeech-high"
        self.assertEqual(bridge._synth_piper("Hello there.", "human", self.cfg, self.out), "en_US-ljspeech-high")

    def test_an_unknown_voice_name_is_reported_not_silently_replaced(self):
        self.cfg["tts_voice"] = "en_US-does-not-exist"
        self.assertIsNone(bridge._synth_piper("Hello.", "human", self.cfg, self.out))
        self.assertIn("tts_no_voice_en_US-does-not-exist", bridge._noted)
        self.assertFalse(self.out.exists())

    def test_without_piper_the_windows_voice_still_speaks(self):
        if os.name != "nt":
            self.skipTest("Windows only")
        saved = bridge._find_piper_exe
        bridge._find_piper_exe = lambda cfg: None
        try:
            self.assertTrue(bridge._generate_tts_wav_locked("Falling back to the built in voice.", "human"))
        finally:
            bridge._find_piper_exe = saved
        self.assertIn("tts_no_piper", bridge._noted)
        self.assertGreater(wav_info(self.out)[3], 1.0)

    @unittest.skipUnless(HAVE_PIPER and XWMA.is_file(), "needs Piper and the Creation Kit's xWMAEncode")
    def test_xwm_output_is_made_when_the_configured_path_is_xwm(self):
        self.out = Path(self.tmp.name) / "npc_voice.xwm"
        self.cfg["xwmaencode_path"] = str(XWMA)
        bridge._get_tts_wav_path = lambda: self.out
        self.assertTrue(bridge._generate_tts_wav_locked("Testing the game audio format.", "human"))
        self.assertGreater(self.out.stat().st_size, 1000)
        self.assertEqual(self.out.read_bytes()[:4], b"RIFF")


if __name__ == "__main__":
    unittest.main()
