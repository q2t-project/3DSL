"""Regression checks for failed, incomplete and private snapshots."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile

SCRIPT = Path(__file__).with_name("site_snapshot.py")


class SnapshotTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.repo = self.root/"repo"
        self.repo.mkdir()
        def git(*args):
            return subprocess.check_output(["git", "-C", str(self.repo), *args], text=True).strip()
        git("init", "-q")
        (self.repo/"tracked.txt").write_text("committed\n", encoding="utf-8")
        git("add", "tracked.txt")
        git("-c", "user.name=Snapshot test", "-c", "user.email=test@example.invalid", "commit", "-qm", "fixture")
        self.head = git("rev-parse", "HEAD")
        (self.repo/"tracked.txt").write_text("uncommitted\n", encoding="utf-8")
        self.dist, self.private, self.out = (self.root/p for p in ("dist","operator","backup"))
        self.private.mkdir()
        (self.private/"域名.txt").write_text("fixture only\n", encoding="utf-8")
        for name in ("index.html","app/viewer/index.html","_headers","_redirects","_routes.json"):
            file = self.dist/name
            file.parent.mkdir(exist_ok=True, parents=True)
            file.write_text("static\n", encoding="utf-8")
        self.probe = self.dist/"__deploy_probe.txt"
        self.probe.write_text(json.dumps({"sha":self.head[:7],"node":"test"}), encoding="utf-8")

    def invoke(self, *args, ok=True):
        result = subprocess.run([sys.executable,str(SCRIPT),*map(str,args)],cwd=self.repo,capture_output=True,text=True)
        self.assertEqual(result.returncode==0,ok,result.stdout+result.stderr)
        return result.stderr

    def pack(self, **kwargs):
        return self.invoke("create","--revision",self.head,"--dist",self.dist,
                           "--operator",self.private,"--output",self.out,**kwargs)

    def test_portable_snapshot(self):
        self.pack()
        self.assertIn("already exists", self.pack(ok=False))
        shutil.rmtree(self.repo/".git")
        shutil.rmtree(self.dist)
        shutil.rmtree(self.private)
        self.invoke("verify", self.out)
        self.assertEqual((self.out/"operator/域名.txt").read_text(encoding="utf-8"), "fixture only\n")
        self.assertFalse((self.out/"site/域名.txt").exists())
        with ZipFile(self.out/"source.zip") as z:
            self.assertEqual(z.read("tracked.txt"),b"committed\n")

    def test_tampering(self):
        self.pack()
        target=self.out/"site/index.html"
        for change in ("change","delete","add"):
            with self.subTest(change=change):
                if change=="change": target.write_text("changed",encoding="utf-8")
                elif change=="delete": target.unlink()
                else: (self.out/"site/unexpected").write_text("extra",encoding="utf-8")
                self.assertIn("inventory differs",self.invoke("verify",self.out,ok=False))
                target.write_text("static\n",encoding="utf-8")

    def test_reject_mismatched_site(self):
        self.probe.write_text('{"sha":"deadbee"}',encoding="utf-8")
        self.assertIn("does not match",self.pack(ok=False))
        self.assertFalse(self.out.exists())

    def test_private_link_not_followed(self):
        try: (self.private/"unexpected").symlink_to(self.repo/"tracked.txt")
        except OSError as exc: self.skipTest(str(exc))
        self.assertIn("Linked snapshot input",self.pack(ok=False))
        self.assertFalse(self.out.exists())

if __name__=="__main__":
    unittest.main()
