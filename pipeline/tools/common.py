"""Shared paths and helpers for the episode pipeline."""
import json
import re
from pathlib import Path

PIPELINE = Path(__file__).resolve().parent.parent
EPISODES = PIPELINE / "episodes"
PUBLIC = PIPELINE / "studio" / "public"
OUT = PIPELINE / "out"


def load_episode(episode_id):
    return json.loads((EPISODES / episode_id / "episode.json").read_text())


def public_dir(episode_id):
    d = PUBLIC / "episodes" / episode_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def write_json(path, data):
    Path(path).write_text(json.dumps(data, indent=2) + "\n")


def norm_token(word):
    """Lowercase and strip punctuation so script and transcript words compare."""
    return re.sub(r"[^a-z0-9']", "", word.lower().replace("’", "'"))
