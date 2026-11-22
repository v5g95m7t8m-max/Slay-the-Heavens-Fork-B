import assert from 'node:assert/strict';

export function replaceOnce(source, anchor, value) {
  assert.equal(source.split(anchor).length, 2, 'Candidate source contract changed: '+anchor);
  return source.replace(anchor, value);
}

export function patchRuntime(source) {
  source = replaceOnce(source, "    if metadata.rectangles~=nil then", `    if type(metadata.precisionTemplateIndex)=='number' and metadata.precisionTemplateIndex>0
        and metadata.precisionTemplateIndex%1==0 and type(metadata.precisionCount)=='number'
        and metadata.precisionCount>=1 and metadata.precisionCount<=400 and metadata.precisionCount%1==0 then
        result={count=metadata.precisionCount,template=metadata.precisionTemplateIndex}
    elseif metadata.rectangles~=nil then`);
  source = replaceOnce(source, "local function advance(record)\n    check(record)", `local function advance(record)
    check(record)
    if record.drawing.template then
        local control=assert(record.instantiate(record.drawing.template,record.pool),'precision prefab creation failed')
        record.groups[1]={control=control,count=record.drawing.count+math.ceil(record.drawing.count/60)}
        check(record)
        visibility(record,true);check(record);record.ready=true
        print('ABYSS_NATIVE_ART ready card_id='..tostring(record.metadata.cardId)..' shapes='..record.drawing.count)
        return
    end`);
  source = replaceOnce(source, '        local progressed=true', '        local prefabCreated=false\n        local progressed=true');
  return replaceOnce(source, 'if record.allocated and eligible(record) and createdLastUpdate<MAX_CREATES then',
    `if record.allocated and eligible(record) and createdLastUpdate<MAX_CREATES
                    and (not record.drawing.template or not prefabCreated) then
                    if record.drawing.template then prefabCreated=true end`);
}

export function patchUi(source, buildId) {
  const id = /^print\("ABYSS_BUILD [^"]+"\)\n/;
  assert(id.test(source), 'Installed startup identity required');
  const body = source.replace(id, 'print("ABYSS_BUILD '+buildId+'")\n');
  return replaceOnce(body, "        if flags.cards then\n            cardArt = optionalArt('cards', function()",
    `        local mode=script:GetParam('precisionLabMode') or 0
        if mode==1 or mode==2 then
            cardArt = optionalArt('cards', function()
                local binding=require('abyss_precision_binding')
                local assets
                if mode==1 then assets=require('abyss_precision_slots') else assets=require('abyss_precision_prefabs') end
                local runtime=require('abyss_card_art_runtime')
                require('abyss_card_display').bindNativeAssets(Presentation,assets)
                runtime.configure({instantiate=game.InstantiateClientUIControl,destroy=game.DestroyClientUIControl,
                    imageTemplateIndex=binding.imageTemplateIndex,containerTemplateIndex=binding.containerTemplateIndex})
                return runtime
            end)
        elseif flags.cards then
            cardArt = optionalArt('cards', function()`);
}
