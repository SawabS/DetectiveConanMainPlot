import json
import os
from pathlib import Path

ROOT = Path("/home/sawab/myfolders/DetectiveConanMainPlot")
TASKS_DIR = ROOT / "translations" / "tasks"
LOCALES_DIR = ROOT / "translations" / "locales"

languages = ["ckb", "ar", "ja"]

for lang in languages:
    locale_file = LOCALES_DIR / f"{lang}.json"
    with open(locale_file) as f:
        data = json.load(f)
        
    messages = data.get("messages", {})
    
    # Merge chunk outputs
    for i in range(10): # 10 chunks per language
        chunk_file = TASKS_DIR / f"chunk_{lang}_{i}_out.json"
        if chunk_file.exists():
            try:
                with open(chunk_file) as f:
                    chunk_data = json.load(f)
                
                # Update messages
                for k, v in chunk_data.items():
                    messages[k] = v
            except Exception as e:
                print(f"Error reading {chunk_file}: {e}")
        else:
            print(f"Missing {chunk_file}")
            
    # Check if all values are translated
    nulls = [k for k, v in messages.items() if v is None]
    if not nulls:
        data["status"] = "reviewed"
    else:
        print(f"{lang} is missing {len(nulls)} translations.")
        
    data["messages"] = messages
    
    with open(locale_file, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Compilation complete.")
