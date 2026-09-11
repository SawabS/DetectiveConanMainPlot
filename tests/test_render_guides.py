"""Check generated reading routes, table coverage, and Markdown safety."""
import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build import outputs


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.links = []
        self.rows = 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        if tag == 'a':
            self.links.append(attrs['href'])
        if tag == 'tr':
            self.rows += 1


class GuideTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = outputs()

    def test_complete_episode_and_movie_tables(self):
        self.assertEqual(Page(self.pages['guide.html']).rows, 256)
        self.assertEqual(Page(self.pages['movie-guide.html']).rows, 36)

    def test_contents_and_relative_links_resolve(self):
        for name in ['guide.html', 'movie-guide.html', 'methodology.html']:
            page = Page(self.pages[name])
            for link in page.links:
                url = urlsplit(link)
                if url.scheme or url.netloc:
                    continue
                if not url.path and url.fragment:
                    self.assertIn(url.fragment, page.ids, (name, link))
                elif url.path:
                    self.assertTrue(url.path in self.pages or (ROOT / url.path).is_file(), (name, link))

    def test_content_is_rendered_and_source_is_downloadable(self):
        html = self.pages['guide.html']
        self.assertIn('<strong>255 episodes', html)
        self.assertIn('<h2 id="episode-checklist">Episode checklist</h2>', html)
        self.assertIn('href="detective_conan_main_story_watch_guide.md" download', html)
        self.assertNotIn('assets/app.js', html)
        self.assertNotIn(chr(8212), html)


if __name__ == '__main__':
    unittest.main()
