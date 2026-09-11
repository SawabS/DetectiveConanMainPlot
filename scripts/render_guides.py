"""Render checked-in Markdown to static, offline reading pages."""
from html import escape
from pathlib import Path
import posixpath
import re
from urllib.parse import urlsplit, urlunsplit
from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    'detective_conan_main_story_watch_guide.md': ('guide.html', 'Main-story guide'),
    'detective_conan_movies.md': ('movie-guide.html', 'Movie guide'),
    'data/analytics-methodology.md': ('methodology.html', 'Analytics methodology'),
}


def render_pages(generated):
    template = (ROOT / 'index.html').read_text()
    head = template.split('<head>', 1)[1].split('</head>', 1)[0]
    head = re.sub(r'\s*<script src="assets/(?!theme\.js|grid-core\.js|presentation\.js)[^"]+"[^>]*></script>', '', head)
    header = template.split('<header class="topbar">', 1)[1].split('</header>', 1)[0]
    header = re.sub(r' data-view-link="[^"]+"', '', header).replace('class="nav-active" ', '')
    header = header.replace('class="nav-guide"', 'class="nav-guide nav-active" aria-current="page"')
    header = re.sub(r'href="#([^\"]*)"', r'href="index.html#\1"', header)
    ambient = template.split('<div class="ambient"', 1)[1].split('</div>\n  <a class="skip-link"', 1)[0]
    outputs = {}
    for source, (destination, title) in PAGES.items():
        md = MarkdownIt('commonmark', {'html': False}).enable('table')
        text = generated.get(source) or (ROOT / source).read_text()
        tokens = md.parse(text)
        headings = {}
        for index, token in enumerate(tokens):
            if token.type == 'heading_open':
                label = tokens[index + 1].content
                slug = re.sub(r'[^\w\s-]', '', label.lower()).replace(' ', '-')
                count = headings.get(slug, 0); headings[slug] = count + 1
                token.attrSet('id', slug if not count else f'{slug}-{count}')
            for child in token.children or []:
                if child.type != 'link_open':
                    continue
                url = urlsplit(child.attrGet('href'))
                if url.scheme or url.netloc or not url.path:
                    continue
                target = posixpath.normpath(posixpath.join(posixpath.dirname(source), url.path))
                target = PAGES[target][0] if target in PAGES else target
                if target == 'CHANGELOG.md':
                    target = 'https://github.com/SawabS/DetectiveConanMainPlot/blob/main/CHANGELOG.md'
                child.attrSet('href', urlunsplit(('', '', target, url.query, url.fragment)))
        body = md.renderer.render(tokens, md.options, {})
        body = body.replace('<table>', '<div class="guide-table-scroll" tabindex="0" role="region" aria-label="Scrollable guide table"><table>')
        body = body.replace('</table>', '</table></div>')
        page_head = re.sub(r'<title>.*?</title>', f'<title>{escape(title)} | Conan Casebook</title>', head)
        outputs[destination] = f'''<!doctype html>
<html lang="en"><head>{page_head}</head><body>
<div class="ambient"{ambient}</div>
<a class="skip-link" href="#guide-content">Skip to guide</a>
<header class="topbar">{header}</header>
<main class="page guide-page">
<nav class="guide-toolbar" aria-label="Guide pages"><a class="button quiet" href="guide.html">Episodes</a><a class="button quiet" href="movie-guide.html">Movies</a><a class="button quiet" href="methodology.html">How we count</a><a class="button quiet" href="{source}" download>Download Markdown ↙</a></nav>
<article id="guide-content" class="guide-article">{body}</article>
</main><footer class="page"><p>Created by <a href="https://github.com/SawabS">SawabS</a> · Unofficial Detective Conan fan project.</p></footer>
</body></html>
'''
    return outputs
