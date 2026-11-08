"""Create or verify a portable 3DSL release snapshot. Python standard library + Git."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tempfile
from zipfile import ZipFile, BadZipFile

MANIFEST = "snapshot.json"


def digest(file):
    checksum = hashlib.sha256()
    size = 0
    with file.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            checksum.update(block)
            size += len(block)
    return {"bytes": size, "sha256": checksum.hexdigest()}


def inventory(root, *, exclude_manifest=False):
    if not root.is_dir() or root.is_symlink():
        raise ValueError(f"Expected a directory: {root}")
    files = {}
    for file in sorted(root.rglob("*")):
        name = file.relative_to(root).as_posix()
        mode = file.lstat().st_mode
        if stat.S_ISLNK(mode) or getattr(file, "is_junction", lambda: False)():
            raise ValueError(f"Linked snapshot input: {name}")
        if stat.S_ISDIR(mode):
            continue
        if not stat.S_ISREG(mode):
            raise ValueError(f"Not an ordinary file: {name}")
        if not (exclude_manifest and name == MANIFEST):
            files[name] = digest(file)
    return files


def compare(expected, actual):
    if expected != actual:
        mismatched = sorted(name for name in expected.keys() | actual.keys()
                            if actual.get(name) != expected.get(name))
        raise ValueError(f"Snapshot inventory differs ({len(mismatched)}): " + ", ".join(mismatched[:8]))


def copy_checked(source, target):
    before = inventory(source)
    shutil.copytree(source, target, symlinks=True)
    compare(before, inventory(target))
    compare(before, inventory(source))


def check_release(folder, commit):
    if not re.fullmatch(r"(?:[0-9a-f]{40}|[0-9a-f]{64})", commit):
        raise ValueError("Expected a full commit ID")
    probe = json.loads((folder/"__deploy_probe.txt").read_text(encoding="utf-8"))
    short = probe.get("sha", "")
    if not re.fullmatch(r"[0-9a-f]{7,64}", short) or not commit.startswith(short):
        raise ValueError("Site deployment probe does not match the source commit")
    for name in ("index.html", "app/viewer/index.html", "_headers", "_redirects", "_routes.json"):
        if not (folder/name).is_file():
            raise ValueError(f"Missing generated site file: {name}")
    return probe


def verify(folder):
    data = json.loads((folder/MANIFEST).read_text(encoding="utf-8"))
    if data["format"] != "3dsl-site-snapshot/1":
        raise ValueError("Unknown snapshot format")
    compare(data["files"], inventory(folder, exclude_manifest=True))
    if check_release(folder/"site", data["commit"]) != data["buildProbe"]:
        raise ValueError("Recorded build information differs from the site probe")
    with ZipFile(folder/"source.zip") as archive:
        if archive.comment != data["commit"].encode("ascii"):
            raise ValueError("Git archive does not match snapshot commit")
    return data


def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()


def create(args):
    commit = git("rev-parse", "--verify", "--end-of-options", args.revision + "^{commit}")
    tree = git("rev-parse", commit + "^{tree}")
    site = args.dist.absolute()
    operator = args.operator.absolute() if args.operator else None
    dest = args.output.absolute()
    if dest.exists() or dest.is_symlink():
        raise ValueError(f"Destination already exists: {dest}")
    repo = Path(git("rev-parse", "--show-toplevel"))
    public = (repo/"apps/site/public").resolve()
    inputs = [site] + ([operator] if operator else [])
    if any(dest.resolve().is_relative_to(folder.resolve()) for folder in [public, *inputs]):
        raise ValueError("Choose a snapshot destination outside the inputs and site/public")
    if operator and (operator.resolve().is_relative_to(site.resolve()) or site.resolve().is_relative_to(operator.resolve())):
        raise ValueError("Keep private operator files separate from the site input")
    probe = check_release(site, commit)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".3dsl-snapshot-", dir=dest.parent) as temporary:
        staged = Path(temporary)/"snapshot"
        staged.mkdir()
        git("archive", "--format=zip", "--output=" + str(staged/"source.zip"), commit)
        copy_checked(site, staged/"site")
        if operator:
            copy_checked(operator, staged/"operator")
        shutil.copyfile(Path(__file__), staged/"site_snapshot.py")
        (staged/"OPEN.txt").write_text(
            "3DSL 復元セット   " + commit + "\n\n"
            "このフォルダーで python site_snapshot.py verify . を実行します。\n"
            "python -m http.server 8765 --bind 127.0.0.1 --directory site\n"
            "http://127.0.0.1:8765/ を開きます。停止は Ctrl+C です。\n"
            "source.zip はこの版のGit原本、site/ はビルド済みの静的配布物です。\n"
            "operator/ がある場合は運営用の非公開資料です。配信対象は site/ だけです。\n"
            "CloudflareのFunctions・HTTPヘッダー・DNS・アカウント復旧は別途確認が必要です。\n",
            encoding="utf-8")
        manifest = {"format":"3dsl-site-snapshot/1", "commit":commit, "tree":tree,
                    "createdAt":datetime.now(timezone.utc).isoformat(), "buildProbe":probe,
                    "files":inventory(staged)}
        (staged/MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
        verify(staged)
        if dest.exists() or dest.is_symlink():
            raise ValueError(f"Destination already exists: {dest}")
        staged.rename(dest)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    pack = commands.add_parser("create", help="capture committed source, a matching built site and optional operator files")
    pack.add_argument("--revision", default="HEAD", help="commit used for the site build")
    pack.add_argument("--dist", type=Path, required=True, help="freshly built site directory")
    pack.add_argument("--operator", type=Path, help="explicitly selected private files; kept outside site/")
    pack.add_argument("--output", type=Path, required=True, help="new snapshot directory")
    check = commands.add_parser("verify", help="check the full snapshot inventory without modifying it")
    check.add_argument("snapshot", type=Path)
    args = parser.parse_args()
    try:
        result = create(args) if args.command == "create" else verify(args.snapshot)
    except (OSError, ValueError, KeyError, BadZipFile, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Snapshot failed: {error}\n")
    print(f"{args.command} OK: {result['commit']}, {len(result['files'])} files")


if __name__ == "__main__":
    main()
