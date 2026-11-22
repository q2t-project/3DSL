import {resolveReadingExample} from './reading-example.js';

export function createReaderNote(model, editionLink) {
  const passage = resolveReadingExample(model);
  if (!passage) return null;
  const target = model.lines.find(line => line.signification.caption === '対象を指す' &&
    line.appearance.end_b.ref === passage.place.meta.uuid && line.signification.sense === 'a_to_b');
  if (!target) return null;
  const noteId = target.appearance.end_a.ref;
  const get = id => document.getElementById(id);
  const body = '最初は、二本とも拡大と縮小を表すと思った。「寄る」の矢印は「部分」に着く。そこから戻る線には「捉え直す」とある。部分で確かめたことを踏まえて、全体をもう一度読む往復やと考えた。';
  get('note-body').textContent = body;
  get('note-evidence').textContent = passage.passage;
  get('note-citation').textContent = passage.citation;
  function show() {
    const url = editionLink(passage.outward);
    const link = get('note-edition');
    link.hidden = !url;
    if (url) link.href = url;
    else link.removeAttribute('href');
    get('note-source').open = false;
    const fallback = get('note-copy-text');
    fallback.hidden = true;
    get('note-feedback').textContent = '';
    const copy = get('note-copy');
    copy.hidden = !url;
    copy.onclick = async () => {
      const text = ['学習者の注（作例）',body,'根拠　'+passage.citation,'「'+passage.passage+'」','参照　この版の「寄る」',url].join('\n');
      try {
        await navigator.clipboard.writeText(text);
        get('note-feedback').textContent = '注・根拠・版固定リンクをコピーしたで。';
      } catch {
        fallback.hidden = false;
        fallback.value = text;
        fallback.focus();
        fallback.select();
        get('note-feedback').textContent = '選択された文面をコピーしてな。';
      }
    };
  }
  return {id:noteId, line:passage.outward, show};
}
