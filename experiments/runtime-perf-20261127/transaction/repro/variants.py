from pathlib import Path
p=Path('build/perf-tx/base.lua'); s=p.read_text()
old="""    local saved,pending={[root]={}},{root}
    local top,kind=1,type
    local keyTables={}
    while top>0 do
        local original=pending[top];pending[top]=nil;top=top-1
        local values=saved[original]"""
new="""    local initial={}
    local saved,pending,snapshots={[root]=initial},{root},{initial}
    local first,last,kind=1,1,type
    local keyTables={}
    while first<=last do
        local original,values=pending[first],snapshots[first]
        first=first+1"""
assert s.count(old)==1
b=s.replace(old,new).replace("saved[k]={};top=top+1;pending[top]=k","local copy={};saved[k]=copy;last=last+1;pending[last],snapshots[last]=k,copy").replace("saved[v]={};top=top+1;pending[top]=v","local copy={};saved[v]=copy;last=last+1;pending[last],snapshots[last]=v,copy")
Path('build/perf-tx/queue.lua').write_text(b)
a=s.replace("""            local tableKey=keyTables[k]
            if tableKey==nil then tableKey=kind(k)=='table';keyTables[k]=tableKey end
            if tableKey and not saved[k] then""","""            if kind(k)=='table' and not saved[k] then""").replace('    local keyTables={}\n','')
Path('build/perf-tx/direct.lua').write_text(a)
flat=s.replace('        for k,v in next,original do\n            values[k]=v','        local fields=0\n        for k,v in next,original do\n            values[fields+1],values[fields+2]=k,v\n            fields=fields+2')
flat=flat.replace('            for k,v in next,values do rawset(original,k,v) end','            for i=1,#values,2 do rawset(original,values[i],values[i+1]) end')
Path('build/perf-tx/flat.lua').write_text(flat)
Path('build/perf-tx/negative.lua').write_text(s.replace('if tableKey and not saved[k] then','if false then'))
