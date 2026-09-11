import json
import math
import os
from pathlib import Path

ROOT = Path("/home/sawab/myfolders/DetectiveConanMainPlot")
TASKS_DIR = ROOT / "translations" / "tasks"
TASKS_DIR.mkdir(parents=True, exist_ok=True)

with open(ROOT / "translations" / "source" / "messages.json") as f:
    messages = json.load(f)

items = list(messages.items())
chunk_size = 150
num_chunks = math.ceil(len(items) / chunk_size)

languages = ["ckb", "ar", "ja"]
documents = ["README.md", "analytics-methodology.md", "detective_conan_main_story_watch_guide.md", "detective_conan_movies.md", "CREDITS.md"]

subagents = []

for lang in languages:
    # 1. JSON chunks
    for i in range(num_chunks):
        chunk = dict(items[i*chunk_size : (i+1)*chunk_size])
        
        # We only pass the text to translate to save tokens for the subagent
        task_data = {}
        for k, v in chunk.items():
            task_data[k] = v['source']
            
        in_file = TASKS_DIR / f"chunk_{lang}_{i}.json"
        out_file = TASKS_DIR / f"chunk_{lang}_{i}_out.json"
        
        with open(in_file, "w") as f:
            json.dump(task_data, f, ensure_ascii=False, indent=2)
            
        prompt = (f"Read the JSON file {in_file}. It maps keys to English text. "
                  f"Translate all the English text values to language '{lang}'. "
                  f"Write the result as a strict JSON file mapping the exact same keys to the translated strings, and save it to {out_file}.")
                  
        subagents.append({
            "TypeName": "translation_agent",
            "Role": f"Translator {lang} JSON {i}",
            "Prompt": prompt,
            "Model": "flash"
        })

    # 2. Document tasks
    for doc in documents:
        in_file = ROOT / "translations" / "source" / "documents" / doc
        out_dir = ROOT / "translations" / "documents" / lang
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / doc
        
        prompt = (f"Read the Markdown file {in_file}. "
                  f"Translate the entire document to language '{lang}'. "
                  f"Preserve all tables, links, code, factual numbers, and Markdown structure. "
                  f"Write the translated Markdown to {out_file}.")
                  
        subagents.append({
            "TypeName": "translation_agent",
            "Role": f"Translator {lang} Doc {doc}",
            "Prompt": prompt,
            "Model": "flash"
        })

with open(TASKS_DIR / "subagents.json", "w") as f:
    json.dump(subagents, f, indent=2)

print(f"Created {len(subagents)} tasks total.")
