// Where a catalogue item's detail page lives, and the view-transition name
// its art shares between a card and that page (so the art glides across).
export const detailPath = (item, kind) =>
  kind === "character" ? `/characters/${item.id}` : `/wearables/${item.id}`;

export const artTransitionName = (item, kind) => `art-${kind}-${item.id}`;
