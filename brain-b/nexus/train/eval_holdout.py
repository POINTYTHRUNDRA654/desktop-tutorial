import sys, numpy as np
sys.path.insert(0,'.')
from fastembed import TextEmbedding
from train_question_classifier import load_rows
import question_classifier as qc
m=qc.QuestionClassifier.load('question_classifier.json'); rows=load_rows('train/holdout.txt')
emb=TextEmbedding("BAAI/bge-small-en-v1.5")
X=[list(map(float,v)) for v in emb.embed([r['q'] for r in rows])]
F=["scene_related","app_help_related","game_data_related","needs_grounding","action_related"]
ok={f:0 for f in F}; okm=0; nm=0; conf=0; confok=0
for r,x in zip(rows,X):
    p=m.predict_vector(x)
    for k,f in enumerate(F): ok[f]+= (p[f][0]==bool(r['flags'][k]))
    if r['flags'][3]: nm+=1; okm+= p['mode'][0]==r['mode']
    if qc.confident(p):
        conf+=1; confok+= all(p[f][0]==bool(r['flags'][k]) for k,f in enumerate(F)) and (not r['flags'][3] or p['mode'][0]==r['mode'])
print(len(rows),'held-out questions'); 
for f in F: print(f'{f:20s}',round(ok[f]/len(rows),3))
print('mode',round(okm/nm,3),'| confident on',conf,'of',len(rows),'and all-correct on',confok)
