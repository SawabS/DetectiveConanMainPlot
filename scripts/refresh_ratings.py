#!/usr/bin/env python3
"""Refresh ratings for reviewed IMDb IDs, without guessing or changing mappings."""
import csv
from datetime import datetime, timezone
import gzip
import io
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def main():
    path = ROOT / 'data/episodes.json'
    data = json.loads(path.read_text())
    wanted = {e['imdb']['id'] for e in data['episodes']}
    ratings = {}
    with urllib.request.urlopen(data['sources']['imdbRatings'], timeout=60) as response:
        stream = io.TextIOWrapper(gzip.GzipFile(fileobj=response), encoding='utf-8')
        reader = csv.DictReader(stream, delimiter='\t')
        if not {'tconst', 'averageRating', 'numVotes'} <= set(reader.fieldnames or []):
            raise ValueError('Unexpected IMDb ratings schema. Existing data was not changed.')
        for row in reader:
            if row['tconst'] in wanted:
                score, votes = float(row['averageRating']), int(row['numVotes'])
                if not 1 <= score <= 10 or votes < 1:
                    raise ValueError('Invalid IMDb rating. Existing data was not changed.')
                ratings[row['tconst']] = (score, votes)
    if not ratings:
        raise ValueError('No mapped IMDb records returned. Existing data was not changed.')
    checked = datetime.now(timezone.utc).date().isoformat()
    for episode in data['episodes']:
        imdb = episode['imdb']
        imdb['rating'], imdb['votes'] = ratings.get(imdb['id'], (None, None))
        imdb['checked'] = checked
    data['updated'] = checked
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)
    from build import main as build
    build()
    print(f'Refreshed {len(ratings)} of {len(wanted)} ratings. Episode selection and IMDb mappings unchanged.')


if __name__ == '__main__':
    main()
