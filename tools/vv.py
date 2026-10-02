"""VOICEVOX helper: load engine once, synthesize text, and show how words are read."""
import os
from voicevox_core import UserDictWord
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, UserDict, VoiceModelFile

HERE = os.path.dirname(os.path.abspath(__file__))
ORT = os.path.join(HERE, "voicevox_onnxruntime-linux-x64-1.17.3/lib/libvoicevox_onnxruntime.so.1.17.3")
DIC = os.path.join(HERE, "open_jtalk_dic_utf_8-1.11")

_synth = None
_ojt = None


def to_katakana(s):
    return "".join(chr(ord(c) + 0x60) if "ぁ" <= c <= "ゖ" else c for c in s)


def set_dictionary(entries):
    """entries: [{surface, reading, accent?}] — registered as single words so the engine never splits them."""
    ud = UserDict()
    for e in entries:
        ud.add_word(UserDictWord(e["surface"], to_katakana(e["reading"]), int(e.get("accent") or 0),
                                 "PROPER_NOUN", 10))
    _ojt.use_user_dict(ud)


def synth(models=("1", "2", "12")):
    global _synth, _ojt
    if _synth is None:
        ort = Onnxruntime.load_once(filename=ORT)
        _ojt = OpenJtalk(DIC)
        _synth = Synthesizer(ort, _ojt)
        for m in models:
            with VoiceModelFile.open(os.path.join(HERE, f"{m}.vvm")) as f:
                _synth.load_voice_model(f)
    return _synth


def reading(text, style=14):
    """Return the katakana the engine will actually speak, phrase by phrase."""
    q = synth().create_audio_query(text, style)
    return " / ".join("".join(m.text for m in ap.moras) for ap in q.accent_phrases)


def wav(text, style, speed=1.0, pitch=0.0, intonation=1.0, pause=1.0):
    s = synth()
    q = s.create_audio_query(text, style)
    q.speed_scale = speed
    q.pitch_scale = pitch
    q.intonation_scale = intonation
    q.pause_length_scale = pause
    q.pre_phoneme_length = 0.3
    q.post_phoneme_length = 0.4
    return s.synthesis(q, style)
