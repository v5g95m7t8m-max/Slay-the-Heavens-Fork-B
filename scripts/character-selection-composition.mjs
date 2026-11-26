import {bands} from './v25-character-layout.mjs';
import {roundedPresetButton} from './native-rounded-button.mjs';
// Positions measured in the 1280x720 Slay the Spire character-screen reference.
// Data and input controls remain owned by the existing selection controller.

const children=n=>n.children??n.controls??[];
const child=(n,name)=>children(n).find(c=>c.name===name);
const frame=(x,y,w,h)=>({position:[x+w/2-640,360-y-h/2],size:[w,h]});
function placeText(n,box,font,colour){
 Object.assign(n,frame(...box));
 Object.assign(n.text,{fontSize:font,minFontSize:font,colour,align:'left',valign:'middle',
  outline:true,outlineColour:'#171311',outlineOpacity:.9});
 n.size[1]=Math.max(n.size[1],font*2);
}
function surface(name,w,h,colour,theme){
 return {name,kind:'container',size:[w,h],children:[{name:'fill',kind:'image',position:[0,0],size:[w,h],image:theme.image.rect,colour}]};
}
export function styleCharacterFlag(button,key,theme){
 const hit=child(button,'hit');
 roundedPresetButton(hit,theme,key==='cancel'?'danger':'primary',{name:'v25Flag',fontSize:24});
 for(const state of children(hit)){
  const label=child(state,'label');
  label.position=[0,0];label.text.minFontSize=24;
 }
}
export function characterSelectionComposition(panel,theme){
 panel.children=panel.children.filter(n=>n.name!=='deckView');
 for(const name of ['v25HeadingEmblem','v25HeadingDivider','v25HeadingRule'])child(panel,name).visible=false;
 const title=child(panel,'title');
 Object.assign(title,frame(400,470,480,60));title.text.content='选择你的角色';
 Object.assign(title.text,{fontSize:30,minFontSize:30,align:'centre'});title.visible=true;
 const details=child(panel,'details');
 const story=child(details,'v25Story');
 story.text.content=story.text.content.replace(/。(?=\S)/,'。\n');
 const specs={name:[[115,216,505,60],48,'#E8C75C'],stats:[[145,280,145,30],18,'#F36C65'],gold:[[328,280,160,30],18,'#DFC552'],
  v25Story:[[115,316,475,theme.layout.nativeText.lineHeight*2],17,'#F3EFDA'],
  relic:[[162,405,430,30],20,'#E7CA5A'],relicText:[[162,429,440,35],17,'#F3EFDA']};
 for(const [name,[box,font,colour]]of Object.entries(specs))placeText(child(details,name),box,font,colour);
 details.children=details.children.filter(n=>!['deckOpen','deckTitle','deckSummary','deckRule'].includes(n.name));
 for(const name of ['relicTag','portraitFrame','floorShadow','officialSelectionFigure']){const n=child(details,name);if(n)n.visible=false;}
 Object.assign(child(details,'v25HealthIcon'),frame(115,286,23,21));
 const bag=child(details,'v25GoldIcon');Object.assign(bag,frame(295,284,25,28));
 const relic=child(details,'v25RelicIcon');
 Object.assign(relic,frame(115,409,36,44),{visible:true});
 const relicArt=theme.lowCostArt.relic;
 const relicScale=40/relicArt.canvas;
 relic.children=relicArt.assets.burning_blood.shapes.map(({x,y,w,h,image,colour,rotation},index)=>({
  name:'facet'+index,kind:'image',position:[x*relicScale,y*relicScale],size:[w*relicScale,h*relicScale],
  image,colour,rotation,raycastTarget:false,
 }));
 const roster=child(panel,'v25Roster');
 const t=theme.layout.stsCharacter,[x,y]=t.roster.origin,[w,h]=t.roster.size;
 const stone=(name)=>({name,kind:'container',size:[w,h],children:[
  {name:'edge',kind:'image',size:[w,h],image:theme.image.rect,colour:'#435756'},
  {name:'face',kind:'image',size:[w-8,h-8],image:theme.image.rect,colour:t.colour.slot},
  ...[[0,0,t.colour.slotLight],[0,90,'#8BA8A7'],[0,180,'#718E8C'],[0,270,'#C3DAD4']].map(([,rotation,colour],i)=>({
   ...bands('bevel'+i,[[4,4],[w-4,4],[w-12,12],[12,12]],colour,theme,{width:w,height:h,step:2}),rotation,
  })),
 ]});
 const selected=child(roster,'selected'),icon=child(selected,'v25Constellation');
 selected.position=[x-640,360-y];selected.size=[w,h];
 const gold=surface('selection',w+8,h+8,t.colour.selected,theme);
 selected.children=[gold,stone('stone'),{...icon,size:[118,118],scale:[.7,.7]}];
 gold.visible=false;
 for(let i=1;i<=3;i++){
  const locked=child(roster,'locked'+i),lock={name:'lock',kind:'container',size:[44,56],children:
   [[0,22,22,4],[0,18,30,4],[-14,10,4,16],[14,10,4,16],
    [0,2,38,4],[0,-26,38,4],[-17,-12,4,28],[17,-12,4,28],
    [0,-9,8,9],[0,-16,5,7]].map(([px,py,sw,sh],j)=>({name:'line'+j,kind:'image',image:theme.image.rect,position:[px,py],size:[sw,sh],colour:'#394C4A'}))};
  locked.position=[x+i*t.roster.step-640,360-y];locked.size=[w,h];
  const dark=n=>{if(n.colour)n.colour='#394C4A';for(const part of children(n))dark(part);};dark(lock);
  locked.children=[stone('stone'),lock];
 }
 // Retain the original input owner over the decorative slot, without its old face.
 const traveler=child(panel,'traveler');traveler.position=[...selected.position];traveler.size=[w,h];
 child(traveler,'hit').size=[w,h];
 for(const state of children(child(traveler,'hit')))for(const part of children(state))part.visible=false;
 child(traveler,'selected').visible=false;
 const avatar=child(traveler,'officialAvatar');if(avatar)avatar.visible=false;
 for(const name of ['cancel','confirm'])styleCharacterFlag(child(panel,name),name,theme);
 // Same existing native portrait controller; a bottom-most, dedicated host.
 panel.children.unshift({name:'lumineSelectionBackground',kind:'container',position:[0,0],size:[1280,720],visible:false,children:[]});
}
