import {replaceOnce} from './candidate-patch.mjs';

// Native bridging can return a fresh Lua wrapper for a live Control. Lua table
// keys use raw identity even when two wrappers compare equal by Control Id.
export function patchControlOwnership(source) {
  let runtime=replaceOnce(source,"local intents=setmetatable({},{__mode='k'})",`local intents=setmetatable({},{__mode='k'})
local keysById=setmetatable({},{__mode='v'})
local function controlKey(control)
    if not control then return nil end
    local id=control.Id
    if type(id)~='number' or id<=0 then return control end
    local key=keysById[id]
    if not key then key={};keysById[id]=key end
    return key
end
local function sameControl(a,b)return controlKey(a)==controlKey(b)end`);
  runtime=replaceOnce(runtime,'local intent={box=box,pool=pool,fallback=fallback,ready=false}',
    'local intent={box=box,key=controlKey(box),pool=pool,fallback=fallback,ready=false}');
  runtime=replaceOnce(runtime,'local record={box=box,pool=pool,metadata=metadata,',
    'local record={box=box,key=controlKey(box),pool=pool,metadata=metadata,');
  const pairs=[
    ['intents[box]=intent','intents[intent.key]=intent'],
    ['record.box==intent.box','record.key==intent.key'],
    ['other.box==record.box','other.key==record.key'],
    ['record.box==box','record.key==controlKey(box)'],
    ['control==intent.pool','sameControl(control,intent.pool)'],
    ['control==intent.fallback','sameControl(control,intent.fallback)'],
    ['intent.pool~=pool','not sameControl(intent.pool,pool)'],
    ['record.pool==pool','sameControl(record.pool,pool)'],
    ['pool==prior.pool','sameControl(pool,prior.pool)'],
    ['previous.pool==pool','sameControl(previous.pool,pool)'],
    ['previous.fallback==fallback','sameControl(previous.fallback,fallback)'],
  ];
  for(const [from,to] of pairs)runtime=replaceOnce(runtime,from,to);
  return runtime.replace(/(records|intents)\[(record\.box|intent\.box|box)\]/g,(_,table,owner)=>
    table+'['+(owner==='box'?'controlKey(box)':owner.replace('.box','.key'))+']');
}
