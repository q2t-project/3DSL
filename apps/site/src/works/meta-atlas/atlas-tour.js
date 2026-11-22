import {resolveReadingExample} from './reading-example.js';

export function createAtlasTour({model, fit, openNote}) {
  const example = resolveReadingExample(model);
  const get = id => document.getElementById(id);
  const panel = get('atlas-tour');
  const launch = get('tour-start');
  const title = get('tour-title');
  const reading = get('tour-reading');
  const text = get('tour-text');
  const quote = get('tour-passage');
  const previous = get('tour-previous');
  const next = get('tour-next');
  const autoplay = get('tour-auto');
  const steps = [
    {view:'all', title:'全景', text:'文章を読んで関係を思い浮かべ、図で確かめる。そこで気づいたことを、次の読者に渡す。その流れを一件の例で見ていこう。', duration:10000},
    {view:'textLegacy', title:'テキストを読む', text:'文章が残るから、後で読み返せる。行きの終点と帰りの始点を、この一節から思い浮かべてみよう。', duration:17000, passage:true},
    {view:'exampleLoop', title:'図で往復を確かめる', text:'「寄る」の矢印は「部分」に着く。同じ「部分」から「捉え直す」の矢印が出る。部分で分かったことを踏まえて、全体をもう一度読む。', duration:14000},
    {view:'socialEffect', title:'注を次の読者へ', text:'先の読者は、気づいたことを「寄る」の線に結び付けて残す。後の読者は、その注と出典から同じ版の同じ一本を開ける。', duration:13000}
  ];
  const last = steps.length - 1;
  let canLaunch = false;
  let index = -1;
  let running = false;
  let timer;
  let generation = 0;

  function stopPending() {
    clearTimeout(timer);
    generation++;
  }

  function setPlaying(value) {
    running = value;
    autoplay.textContent = value ? '一時停止' : '自動で進む';
  }

  function schedule(step) {
    stopPending();
    if (!running) return;
    const turn = generation;
    timer = setTimeout(() => {
      if (turn !== generation || !running) return;
      if (index < last) show(index + 1);
      else pause();
    }, step.duration);
  }

  function show(nextIndex) {
    index = nextIndex;
    const step = steps[index];
    title.textContent = step.title;
    text.textContent = step.text;
    get('tour-count').textContent = (index + 1) + ' / ' + steps.length;
    quote.hidden = !step.passage;
    get('tour-open-note').hidden = index !== last;
    previous.disabled = index === 0;
    next.textContent = index === last ? '全景へ戻る' : '次へ';
    autoplay.hidden = index === last && !running;
    panel.hidden = false;
    document.body.classList.add('atlas-tour-open');
    fit(step.view);
    panel.scrollTop = 0;
    title.focus({preventScroll:true});
    schedule(step);
  }

  function pause() {
    if (index < 0) return;
    stopPending();
    setPlaying(false);
    if (index === last) autoplay.hidden = true;
  }

  function close() {
    if (index < 0) return;
    pause();
    index = -1;
    panel.hidden = true;
    document.body.classList.remove('atlas-tour-open');
    launch.hidden = !canLaunch;
  }

  function finish() {
    close();
    fit('all');
    launch.focus({preventScroll:true});
  }

  if (example) quote.textContent = example.passage;
  reading.addEventListener('pointerdown', () => {
    if (running) pause();
  });
  document.addEventListener('selectionchange', () => {
    if (!running || panel.hidden) return;
    const selection = document.getSelection();
    if (selection?.rangeCount && !selection.isCollapsed &&
        selection.getRangeAt(0).intersectsNode(reading)) {
      pause();
    }
  });
  launch.onclick = () => show(0);
  autoplay.onclick = () => {
    if (running) pause();
    else {
      setPlaying(true);
      schedule(steps[index]);
    }
  };
  previous.onclick = () => show(index - 1);
  next.onclick = () => index < last ? show(index + 1) : finish();
  get('tour-close').onclick = finish;
  get('tour-open-note').onclick = () => {
    close();
    openNote();
  };

  return {
    pause,
    close,
    onView(view, embedded) {
      canLaunch = Boolean(example && embedded && view === 'all');
      if (index >= 0 && (!embedded || view !== steps[index].view)) close();
      launch.hidden = !canLaunch || index >= 0;
    },
  };
}
