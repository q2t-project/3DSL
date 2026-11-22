// Resolve the passage and the pair of directed edges that the published edition cites.
export function resolveReadingExample(model) {
  const tagged = (point, tag) => point.meta.tags?.includes(tag);
  const place = model.points.find(point => tagged(point, 'm:参照箇所'));
  const source = model.points.find(point => tagged(point, 'm:出典本文') && tagged(point, 'x:入口の照合'));
  const reference = place?.meta.tags.find(tag => tag.startsWith('m:参照線-'));
  const outward = model.lines.find(line => line.meta.uuid === reference?.slice('m:参照線-'.length));
  if (!source || !outward || outward.signification.sense !== 'a_to_b') return null;

  const ends = outward.appearance;
  const start = model.points.find(point => point.meta.uuid === ends.end_a.ref);
  const turn = model.points.find(point => point.meta.uuid === ends.end_b.ref);
  const back = model.lines.find(line => line.signification.sense === 'a_to_b' &&
    line.signification.relation?.dynamic === 'feedback' &&
    line.appearance.end_a.ref === ends.end_b.ref && line.appearance.end_b.ref === ends.end_a.ref);
  const excerpt = source.meta.creator_memo?.match(/『([^』]+)』「([^」]+)」より。「(.+)」(?:\n|$)/);
  if (!start || !turn || !back || !excerpt) return null;
  return { start, turn, outward, back, place, passage: excerpt[3], citation: '『' + excerpt[1] + '』「' + excerpt[2] + '」' };
}

export function createReadingExample({model, fit, editionLink, currentView}) {
  const example = resolveReadingExample(model);
  const get = id => document.getElementById(id);
  const panel = get('reading-example');
  const launch = get('example-start');
  const choices = get('example-choices');
  const copy = get('example-copy');
  const link = get('example-edition-link');
  const next = get('example-next');
  const prev = get('example-prev');
  const heading = get('example-heading');
  const message = get('example-message');
  const quote = get('example-quote');
  const quoteDetails = get('example-source');
  let stage = '';
  let origin = 'all';
  let internalFit = false;
  let activeView = '';
  let selectedLine = null;
  const id = item => item.meta.uuid;
  const name = item => item.signification.name ?? item.signification.caption;

  if (example) {
    quote.textContent = example.passage;
    get('example-citation').textContent = example.citation;
  }

  function move(view) {
    internalFit = true;
    activeView = view;
    try { fit(view); } finally { internalFit = false; }
  }

  function show(step, keepReadingPosition = false) {
    stage = step;
    if (step !== 'share') selectedLine = null;
    panel.hidden = false;
    document.body.classList.add('reading-example-open');
    quoteDetails.open = step === 'read';
    get('example-pick').hidden = step !== 'turn' && step !== 'outward';
    get('example-pick').open = false;
    next.hidden = step !== 'read';
    prev.hidden = step === 'read';
    link.hidden = copy.hidden = step !== 'share';
    message.textContent = '';
    choices.replaceChildren();
    const prompts = {
      read: '行きの終点と、帰りの始点はどこやろう。',
      turn: '行きの終点と帰りの始点を兼ねる点を、図で選ぶ。',
      outward: '後の読者に行きの一本を示すなら、どの矢印を渡す？',
      share: '本文と図の二つの入口が、同じ「箇所」に集まる。'
    };
    heading.textContent = prompts[step];
    if (step === 'turn' || step === 'outward') {
      const options = step === 'turn' ? [example.start, example.turn] : [example.back, example.outward];
      for (const item of options) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = name(item);
        button.onclick = () => select(id(item));
        choices.append(button);
      }
    }
    if (step === 'outward') message.textContent = '「部分」に着いたところから、帰りの線が始まる。';
    if (step === 'share') {
      const href = editionLink(selectedLine);
      if (href) {
        link.href = href;
        link.textContent = 'この版の「' + name(selectedLine) + '」を開く';
        copy.hidden = !navigator.clipboard?.writeText;
      } else {
        link.removeAttribute('href');
        link.hidden = copy.hidden = true;
      }
      message.textContent = href
        ? '次の読者がこのリンクを開くと、「' + name(example.start) + '」から「' + name(example.turn) + '」へ向かう同じ一本が選ばれる。'
        : 'この線を開ける版固定リンクは見つからへんかった。';
    }
    const view = step === 'read' ? 'textLegacy' : step === 'share' ? 'entrances' : 'exampleLoop';
    if (!keepReadingPosition || activeView !== view) move(view);
    heading.focus({preventScroll:true});
  }

  function select(uuid) {
    if (!stage || internalFit) return false;
    if (stage !== 'turn' && stage !== 'outward') return false;
    if (stage === 'turn' && uuid === id(example.turn)) {
      show('outward', true);
    } else if (stage === 'outward' && uuid === id(example.outward)) {
      selectedLine = example.outward;
      show('share');
    } else {
      message.textContent = stage === 'turn'
        ? '「寄る」の矢じりが着く点と、「捉え直す」の線が出る点を見比べて。'
        : '矢じりが「部分」へ向かっているほうをたどって。';
    }
    return true;
  }

  function hide() {
    stage = '';
    selectedLine = null;
    activeView = '';
    panel.hidden = true;
    link.removeAttribute('href');
    document.body.classList.remove('reading-example-open');
  }
  function close() {
    hide();
    fit(origin);
    if (!launch.hidden) launch.focus({preventScroll:true});
  }
  launch.onclick = () => { origin = currentView(); show('read'); };
  next.onclick = () => show('turn');
  prev.onclick = () => show(({turn:'read',outward:'turn',share:'outward'})[stage]);
  get('example-close').onclick = close;
  copy.onclick = async () => {
    const href = link.href;
    try {
      await navigator.clipboard.writeText(href);
      if (stage === 'share' && href === link.href) message.textContent = 'この版の「寄る」のリンクをコピーしたで。';
    } catch {
      if (stage === 'share') message.textContent = '「この版の『寄る』を開く」のリンクから、端末のリンクコピーも使えるで。';
    }
  };

  return {
    select,
    ids: example ? [example.start, example.turn, example.outward, example.back].map(id) : [],
    onView(view, embedded) {
      if (stage && !internalFit && (!embedded || view !== activeView)) hide();
      launch.hidden = !example || !embedded || !!stage || !['all','textLegacy','structureWork','socialEffect'].includes(view);
    }
  };
}
