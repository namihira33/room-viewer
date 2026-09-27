#!/usr/bin/env python3
"""Basic local-path, HTTP delivery, MIME and JS syntax checks (stdlib + optional Node)."""
from __future__ import annotations
import hashlib,json,re,subprocess,threading,shutil
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from urllib.request import urlopen
from html.parser import HTMLParser
from serve import Handler
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(Handler):
    def log_message(self,*args):pass
class Parser(HTMLParser):
    def __init__(self):super().__init__();self.refs=[];self.ids=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        for k in ['src','href']:
            if d.get(k,'').startswith('./'):self.refs.append(d[k])
def main():
    result={'missingFiles':[],'http':{},'jsSyntax':{},'scope':'Local path checks and stdlib HTTP delivery. Browser rendering tested separately with memory-supplied files. GitHub Pages itself not tested.'}
    parser=Parser();parser.feed((ROOT/'index.html').read_text(encoding='utf-8'))
    result['duplicateHtmlIds']=sorted({x for x in parser.ids if parser.ids.count(x)>1})
    runtime=['index.html','viewer.js','styles.css','models/model.glb','models/model.usdz','models/model-mini.usdz','assets/preview.jpg','assets/rotation-preview.mp4','source/model.js']
    runtime += [str(p.relative_to(ROOT)) for p in (ROOT/'vendor').rglob('*.js')]
    refs=set(runtime+[p.removeprefix('./') for p in parser.refs if p!='./'])
    for rel in refs:
        if not (ROOT/rel).is_file():result['missingFiles'].append(rel)
    for file in (ROOT/'vendor').rglob('*.js'):
        cleaned=re.sub(r'/\*.*?\*/','',file.read_text(encoding='utf-8'),flags=re.S)
        for rel in re.findall(r'''(?:from\s+|import\s*\(\s*|import\s+)["'](\.[^"']+)["']''',cleaned):
            if not (file.parent/rel).resolve().is_file():result['missingFiles'].append(str(file.relative_to(ROOT))+' => '+rel)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        for rel in sorted(refs):
            if not (ROOT/rel).is_file():continue
            with urlopen(f'http://127.0.0.1:{server.server_port}/{rel}',timeout=60) as response:
                content=response.read()
                result['http'][rel]={'status':response.status,'mime':response.headers.get('Content-Type'),'sameBytes':hashlib.sha256(content).digest()==hashlib.sha256((ROOT/rel).read_bytes()).digest()}
    finally:server.shutdown();server.server_close()
    if shutil.which('node'):
        for rel in ['viewer.js','source/model.js']:
            c=subprocess.run(['node','--check',str(ROOT/rel)],capture_output=True,text=True)
            result['jsSyntax'][rel]={'exitCode':c.returncode,'stderr':c.stderr.strip()}
    result['originalMediaIncluded']=any(p.suffix.lower()=='.mov' or p.name in ['image.png','IMG_0494.MOV'] for p in ROOT.rglob('*') if p.is_file())
    (ROOT/'checks/static-site-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='http'},ensure_ascii=False,indent=2))
    print(f'HTTP files checked: {len(result["http"])}')
    if result['missingFiles'] or result['duplicateHtmlIds'] or any(not x['sameBytes'] for x in result['http'].values()):raise SystemExit(1)
if __name__=='__main__':main()
