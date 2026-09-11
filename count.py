import json

with open("translations/locales/ar.json") as f:
    d = json.load(f)
    
nulls = [k for k, v in d["messages"].items() if v is None]
print(f"ar.json: Null messages: {len(nulls)} out of {len(d['messages'])}")

with open("translations/source/messages.json") as f:
    d = json.load(f)
print(f"messages.json: {len(d)} messages")

with open("translations/source/content.json") as f:
    d = json.load(f)
print(f"content.json: keys: {list(d.keys())}")
if "episodes" in d:
    print(f"content.json episodes: {len(d['episodes'])}")
if "movies" in d:
    print(f"content.json movies: {len(d['movies'])}")

