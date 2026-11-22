// Instrumentation geometry only. No portrait assets are used.
export const cardIds = ['strike','defend','bash','whirlwind','barricade','demon_form','armaments','cleave','heavy_blade','anger'];
export const tiers = [60,100,160,250,400];
const color = (i, variant) => [(i*13+variant*27)%256,(i*7+variant*43)%256,(i*3+variant*63)%256,255];
const hex = c => '#'+c.slice(0,3).map(x=>x.toString(16).padStart(2,'0')).join('');
export const hashPrecision = (count, variant) => Array.from({length:count},(_,i)=>[
  [100001,100002,100003][i%3], -65+(i%20)*6.75, 26-Math.floor(i/20)*2.7,
  4+(i%5), 4+(i%4), i%18*10, ...color(i,variant)
]);
export function nativeImages(rows) {
  return rows.map(([image,x,y,w,h,rotation,r,g,b,a],i)=>({
    name:'shape'+i, kind:'image', size:[w,h], position:[x,y], image,
    rotation, colour:hex([r,g,b]), opacity:a/255, visible:true,
  }));
}
export function legacySlots(rows) {
  return rows.map(([image,x,y,w,h,z,...colour])=>({
    image,imageType:'basic',position:[x,y],size:[w,h],rotation:[0,0,z],colour,
    pivot:[.5,.5],anchorMin:[.5,.5],anchorMax:[.5,.5],scale:[1,1],
  }));
}
export function nativeTemplate(name, rows) {
  const images=nativeImages(rows);
  return {name,kind:'container',size:[144,64],visible:true,children:
    Array.from({length:Math.ceil(images.length/60)},(_,i)=>({
      name:'group'+i,kind:'container',size:[144,64],visible:true,children:images.slice(i*60,i*60+60),
    }))};
}
