import time
import os
import subprocess
from pathlib import Path

ROOT = Path("/home/sawab/myfolders/DetectiveConanMainPlot")
TASKS_DIR = ROOT / "translations" / "tasks"

languages = ["ckb", "ar", "ja"]
expected_json = 30
expected_md = 15

print("Waiting for all subagents to finish...")

while True:
    json_count = len(list(TASKS_DIR.glob("*_out.json")))
    md_count = len(list((ROOT / "translations" / "documents").rglob("*.md")))
    
    if json_count >= expected_json and md_count >= expected_md:
        print("All output files detected! Compiling translations...")
        subprocess.run(["python3", "compile_translations.py"], cwd=ROOT)
        break
        
    print(f"Waiting... JSON: {json_count}/{expected_json}, MD: {md_count}/{expected_md}")
    time.sleep(10)
