#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_DIR="${ROOT_DIR}/skills"
TARGET_DIR="${RULE_MCP_SKILLS_DIR:-${HOME}/.agents/skills}"

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Skills directory missing: ${SOURCE_DIR}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
rm -rf "${TARGET_DIR}/rule"
installed=0

for skill_dir in "${SOURCE_DIR}"/*; do
  [[ -d "${skill_dir}" && -f "${skill_dir}/SKILL.md" ]] || continue
  skill_name="$(basename "${skill_dir}")"
  destination="${TARGET_DIR}/${skill_name}"
  rm -rf "${destination}"
  cp -R "${skill_dir}" "${destination}"
  echo "✓ ${skill_name}"
  installed=$((installed + 1))
done

echo "Installed ${installed} skills to ${TARGET_DIR}"
