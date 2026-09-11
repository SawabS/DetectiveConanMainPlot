"""Extract translation text and compile reviewed values into offline browser dictionaries."""
import argparse
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
TRANSLATIONS=ROOT/'translations'
LANGUAGES={'ckb':('کوردیی ناوەندی','rtl'),'ar':('العربية','rtl'),'ja':('日本語','ltr')}
PAGES=['index.html','guide.html','movie-guide.html','methodology.html']


def read(path):
    return json.loads(path.read_text())


def write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')


def extract():
    messages={}
    def add(text,reference,kind='text',variables=None):
        text=re.sub(r'\s+',' ',text).strip()
        if not re.search(r'[A-Za-z]',text) or re.fullmatch(r'[\d\W]*',text):return
        key='text_'+hashlib.sha256(text.encode()).hexdigest()[:12]
        item=messages.setdefault(key,{'source':text,'kind':kind,'references':[]})
        if reference not in item['references']:item['references'].append(reference)
        if variables:item.setdefault('variables',variables)
    class TextParser(HTMLParser):
        def __init__(self,reference,variables=None):
            super().__init__();self.reference=reference;self.variables=variables;self.skip=0
        def handle_starttag(self,tag,attrs):
            if tag in ('script','style'):self.skip+=1
            for key,value in attrs:
                if key in ('aria-label','alt','title','placeholder') and value:add(value,self.reference,key,self.variables)
                if tag=='meta' and key=='content' and any(k=='name' and v=='description' for k,v in attrs):add(value,self.reference,'description')
        def handle_endtag(self,tag):
            if tag in ('script','style'):self.skip=max(0,self.skip-1)
        def handle_data(self,text):
            if not self.skip:add(text,self.reference,'text',self.variables)
    for page in PAGES:TextParser(page).feed((ROOT/page).read_text())
    inventory=read(TRANSLATIONS/'source/javascript-inventory.json')
    for item in inventory:
        text=item['text'];ref=f"{item['file']}:{item['line']}"
        if '<' in text and re.search(r'</?\w',text):TextParser(ref,item.get('variables')).feed(text)
        # Keep every JS literal/template in the inventory; offer human-facing candidates in the catalog.
        elif (re.search(r'\s',text) or text[:1].isupper()) and not text.startswith(('https:','data:')):
            add(text,ref,item['kind'],item.get('variables'))
    content={}
    def leaves(value,path):
        if isinstance(value,dict):
            for key,child in value.items():leaves(child,path+'.'+key)
        elif isinstance(value,list):
            for i,child in enumerate(value):leaves(child,path+f'[{i}]')
        elif isinstance(value,str):
            content[path]=value
            if re.search(r'[A-Za-z]',value) and not value.startswith(('http:','https:','assets/')) and (re.search(r'\s',value) or value[:1].isupper()):add(value,path,'catalog content')
    for name in ['episodes','movies']:leaves(read(ROOT/f'data/{name}.json'),name)
    write(TRANSLATIONS/'source/content.json',content)
    write(TRANSLATIONS/'source/messages.json',dict(sorted(messages.items())))
    for source in ['detective_conan_main_story_watch_guide.md','detective_conan_movies.md','data/analytics-methodology.md','assets/CREDITS.md','README.md']:
        (TRANSLATIONS/'source/documents'/Path(source).name).write_text((ROOT/source).read_text())
    for locale,(name,direction) in LANGUAGES.items():
        path=TRANSLATIONS/f'locales/{locale}.json';old=read(path) if path.exists() else {}
        write(path,{'locale':locale,'name':name,'direction':direction,'status':old.get('status','draft'),'messages':{key:old.get('messages',{}).get(key) for key in sorted(messages)}})
    print(f'Extracted {len(messages)} text units, {len(inventory)} JS literals/templates, and {len(content)} catalog string fields.')


def compile_locales(check=False):
    source=read(TRANSLATIONS/'source/messages.json');result={}
    for locale in LANGUAGES:
        data=read(TRANSLATIONS/f'locales/{locale}.json');values=data['messages'];compiled={}
        assert set(values)==set(source),f'{locale}: catalog keys differ; run extraction after reviewing changes'
        for key,value in values.items():
            if value is None:continue
            assert isinstance(value,str) and value.strip(),f'{locale}:{key}: use null for pending text'
            assert chr(8212) not in value,f'{locale}:{key}: em dash'
            original=source[key]['source']
            assert sorted(re.findall(r'\{\d+\}',original))==sorted(re.findall(r'\{\d+\}',value)),f'{locale}:{key}: placeholders changed'
            compiled[key]={'source':original,'translation':value}
        if data['status']=='reviewed':assert len(compiled)==len(source),f'{locale}: review cannot be complete with missing messages'
        result[locale]={'name':data['name'],'direction':data['direction'],'status':data['status'],'messages':compiled}
    text='// Generated by scripts/translations.py. Edit translations/locales/*.json.\nwindow.CONAN_LOCALES = '+json.dumps(result,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+';\n'
    target=ROOT/'assets/locales.js'
    if check:assert target.read_text()==text,'Locale bundle is stale'
    else:target.write_text(text)
    print('Locale bundle checked.' if check else 'Compiled locale bundle with English fallback.')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--extract',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args()
    if args.extract:extract()
    compile_locales(args.check)
