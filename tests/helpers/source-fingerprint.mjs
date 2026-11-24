import {createHash} from 'node:crypto';

// Cache computations over exact immutable strings only. Every caller still
// reads its owners afresh and applies its own binding and authorization.
const fingerprints=new Map(),limit=8*1024*1024;
let retained=0;

export function exactSourceMatches(source,binding){
 if(typeof source!=='string')return false;
 let fingerprint=fingerprints.get(source);
 if(!fingerprint){
  if(source.includes('\r\r\n'))return false;
  const text=source.replaceAll('\r\n','\n');
  const length=text===source?source.length:source.length+text.length;
  fingerprint={text,length,sha256:createHash('sha256').update(text).digest('hex')};
  if(length<=limit){
   while(fingerprints.size>=512||retained+length>limit){
    const first=fingerprints.keys().next().value;
    retained-=fingerprints.get(first).length;
    fingerprints.delete(first);
   }
   fingerprints.set(source,fingerprint);
   retained+=length;
  }
 }
 if(fingerprint.sha256!==binding.sha256)return false;
 const {text}=fingerprint;
 fingerprint.gitBlob??=createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
 return fingerprint.gitBlob===binding.gitBlob;
}

// Cache only layout calculations for the exact text supplied by the caller.
// This never skips a source read or validates identity on an owner's behalf.
const configLayouts=new Map(),configLimit=2*1024*1024;
let configRetained=0;
function readConfigLayout(source){
 let layout=configLayouts.get(source);
 if(layout)return layout;
 const tokens=source.replace(/"(?:\\.|[^"\\])*"|[ \t\r\n]+/g,token=>token.startsWith('"')?token:'');
 const length=source.length+tokens.length;
 layout={tokens,length};
 if(length<=configLimit){
  while(configLayouts.size>=128||configRetained+length>configLimit){
   const first=configLayouts.keys().next().value;
   configRetained-=configLayouts.get(first).length;
   configLayouts.delete(first);
  }
  configLayouts.set(source,layout);
  configRetained+=length;
 }
 return layout;
}
export const configSourceTokens=source=>readConfigLayout(source).tokens;
export function sourceConfigLayoutMatches(source,expectedSha256){
 if(!expectedSha256||typeof source!=='string'||source.includes('\r\r\n'))return false;
 const layout=readConfigLayout(source);
 layout.sha256??=createHash('sha256').update(layout.tokens).digest('hex');
 if(layout.sha256!==expectedSha256)return false;
 if(layout.valid===undefined){
  try{JSON.parse(source);layout.valid=true;}catch{layout.valid=false;}
 }
 return layout.valid;
}
