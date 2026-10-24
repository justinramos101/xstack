"""xstack for Hermes Agent.

Registers each bundled skill as ``xstack:<name>``, so ``skill_view`` loads it and
``/xstack:<name>`` invokes it. A skill whose frontmatter sets
``disable-model-invocation: true`` is meant to be run by the user, so it registers
without a description: the system prompt's skill index lists only its name instead
of inviting the model to load it on its own. Reads nothing but this plugin's files.
"""

import logging
import re
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

_SKILLS = Path(__file__).resolve().parent / "skills"
_FRONTMATTER = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n", re.S)


def _frontmatter(skill_md: Path) -> dict:
    match = _FRONTMATTER.match(skill_md.read_text(encoding="utf-8"))
    parsed = yaml.safe_load(match.group(1)) if match else None
    if not isinstance(parsed, dict):
        raise ValueError("SKILL.md has no frontmatter mapping")
    return parsed


def register(ctx, **kwargs):
    for skill_md in sorted(_SKILLS.glob("*/SKILL.md")):
        try:
            frontmatter = _frontmatter(skill_md)
            user_only = frontmatter.get("disable-model-invocation") is True
            description = "" if user_only else str(frontmatter.get("description") or "")
            ctx.register_skill(skill_md.parent.name, skill_md, description=description)
        except (OSError, ValueError, yaml.YAMLError) as exc:
            logger.warning("xstack: skipped skill %s: %s", skill_md.parent.name, exc)
