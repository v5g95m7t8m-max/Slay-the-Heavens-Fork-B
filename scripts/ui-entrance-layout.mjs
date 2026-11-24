// Group motion after styling, so skins, templates and artwork retain their original anchors.
const children = node => node?.controls ?? node?.children ?? [];
const child = (node, name) => children(node).find(control => control.name === name);

function shopLayers(nodePanel, theme) {
  const shelf = child(nodePanel, 'shopView');
  const followsPreviousRug = control => /^(removal|relic|potion)/.test(control.name);
  const goods = shelf.children.filter(followsPreviousRug);
  shelf.children = shelf.children.filter(control => !followsPreviousRug(control));
  shelf.children.splice(shelf.children.findIndex(control => control.name === 'detail'), 0,
    { name: 'goods', kind: 'container', size: [...theme.canvas.base], visible: false, children: goods });
}

function selectionLayers(stage, theme, slots) {
  const character = child(stage, 'characterPanel');
  const details = child(character, 'details');
  const infoNames = new Set(['name', 'stats', 'gold', 'v25Story', 'v25HealthIcon', 'v25GoldIcon',
    'relicTag', 'relic', 'relicText', 'v25RelicIcon', 'deckRule', 'deckTitle', 'deckSummary']);
  const info = details.children.filter(control => infoNames.has(control.name));
  details.children = details.children.filter(control => !infoNames.has(control.name));
  details.children.push({ name: 'infoMotion', kind: 'container', size: [...theme.canvas.base],
    children: Array.from({ length: slots }, (_, i) => ({
      name: 'info' + (i + 1), kind: 'container', size: [...theme.canvas.base],
      visible: false, children: structuredClone(info),
    })),
  });
  child(character, 'confirm').visible = false;
  child(character, 'cancel').visible = false;
  const nativeArtwork = child(character, 'lumineSelectionBackground');
  if (nativeArtwork) nativeArtwork.children.push({
    name: 'figure', kind: 'container', position: [0, 0], size: [...theme.canvas.base],
    visible: false, children: [],
  });
  const selectionBackground = child(character, 'v25Background');
  if (child(selectionBackground ?? {}, 'landscape')) selectionBackground.children.push({
    name: 'selectionShade', kind: 'image', position: [0, 0], size: [...theme.canvas.base],
    image: theme.image.rect, colour: '#000000', visible: false,
  });
}

export function attachEntranceLayers(stage, theme, singleCharacter) {
  shopLayers(child(stage, 'nodePanel'), theme);
  selectionLayers(stage, theme, singleCharacter ? 1 : 8);
}
