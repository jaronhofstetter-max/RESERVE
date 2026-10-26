/* Local-only owner diagnostic. Images stay in this browser; no inference endpoint. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const photos = $('photos'), submit = $('submit'), cancel = $('cancel');
  let selected = [], active = null, result = null, nextId = 1, library;
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const message = (text, error = false) => {
    $('status').textContent = text; $('status').dataset.error = String(error);
  };
  function controls() {
    submit.disabled = !!active || !selected.length; photos.disabled = !!active;
    $('same-recipe').disabled = !!active; $('clear').disabled = !!active;
    cancel.hidden = !active;
    document.querySelectorAll('[data-remove]').forEach(button => { button.disabled = !!active; });
  }
  function clearResult() {
    result = null; $('recipes').replaceChildren(); $('raw-text').textContent = ''; $('results').hidden = true;
  }
  function previews() {
    $('previews').replaceChildren();
    selected.forEach((page, index) => {
      const figure = node('figure', undefined, 'preview'), link = node('a');
      link.href = page.url; link.target = '_blank'; link.rel = 'noopener';
      link.setAttribute('aria-label', `Seite ${index + 1} gross öffnen`);
      const image = node('img'); image.src = page.url; image.alt = `Original Seite ${index + 1}`; link.append(image);
      const remove = node('button', 'Entfernen', 'secondary'); remove.type = 'button'; remove.dataset.remove = page.id;
      remove.setAttribute('aria-label', `Seite ${index + 1} entfernen`);
      remove.addEventListener('click', () => {
        URL.revokeObjectURL(page.url); selected = selected.filter(item => item !== page);
        clearResult(); previews(); controls(); message('Foto entfernt.');
      });
      figure.append(link, node('figcaption', `Seite ${index + 1} · ${page.id} · ${page.file.name}`), remove);
      $('previews').append(figure);
    });
  }
  photos.addEventListener('change', () => {
    const files = Array.from(photos.files || []); photos.value = '';
    if (!files.length) return;
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size)) {
      message('Bitte JPG-, PNG- oder WebP-Fotos auswählen. Leere Dateien und PDFs sind nicht geeignet.', true); return;
    }
    if (selected.length + files.length > 12 || [...selected.map(page => page.file), ...files].reduce((sum, file) => sum + file.size, 0) > 6 * 1024 * 1024) {
      message('Höchstens 12 Fotos und zusammen 6 MiB. Wähle weniger oder verkleinere grosse Fotos.', true); return;
    }
    clearResult();
    for (const file of files) selected.push({ id: `page-${nextId++}`, file, url: URL.createObjectURL(file) });
    previews(); controls(); message(`${selected.length} Foto(s) bereit. Prüfe die Reihenfolge vor dem Start.`);
  });
  $('same-recipe').addEventListener('change', clearResult);
  function loadReader() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!library) library = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'assets/rekek/quantity-test/vendor/tesseract.min.js';
      script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(Error('reader_load'));
      script.onerror = () => { script.remove(); reject(Error('reader_load')); };
      document.head.append(script);
    }).catch(error => { library = null; throw error; });
    return library;
  }
  async function canvasFor(page) {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(Error('image_read')); image.src = page.url; });
    if (image.naturalWidth * image.naturalHeight > 25000000) throw Error('image_size');
    const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d'); context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height); return canvas;
  }
  function show(data) {
    const fragment = document.createDocumentFragment(), parser = window.RESERVE_RECIPE_PARSER;
    for (const recipe of data.recipes) {
      const article = node('article', undefined, 'recipe');
      article.append(node('h3', recipe.name || 'Titel nicht erkannt'), node('p', `Portionen: ${recipe.portions || 'nicht angegeben / nicht lesbar'}`),
        node('p', `Quellseiten: ${recipe.page_ids.join(', ')}`, 'source'), node('h4', 'Zutaten'));
      const lines = recipe.ingredients.split('\n').filter(Boolean);
      if (!lines.length) article.append(node('p', 'Keine Zutaten erkannt.'));
      for (const raw of lines) {
        const reading = parser.ingredient(raw), ingredient = node('div', undefined, 'ingredient');
        ingredient.append(node('strong', raw));
        ingredient.append(node('p', reading.amount === null ? 'Menge offen · am Foto prüfen' : `Gelesene Menge: ${reading.amount} ${reading.unit || '[Einheit offen]'} · am Foto prüfen`, 'source'));
        article.append(ingredient);
      }
      article.append(node('h4', 'Zubereitung'));
      const steps = node('ol'); recipe.steps.split('\n').filter(Boolean).forEach(step => steps.append(node('li', step))); article.append(steps);
      if (!recipe.steps) article.append(node('p', 'Keine Zubereitung erkannt.'));
      if (recipe.unresolved.length) {
        article.append(node('h4', 'Offene Stellen'));
        const unclear = node('ul'); recipe.unresolved.forEach(item => unclear.append(node('li', item.raw))); article.append(unclear);
      }
      fragment.append(article);
    }
    if (!data.recipes.length) fragment.append(node('p', 'Keine eindeutige Rezeptaufteilung erkannt. Bitte den OCR-Text und die Fotos prüfen.'));
    $('recipes').replaceChildren(fragment);
    $('raw-text').textContent = data.pages.map(page => `${page.id}\n${page.raw}`).join('\n\n');
    result = data; $('results').hidden = false;
  }
  function stop(reason) {
    if (!active) return; active.reason = reason;
    active.reject(Error('stopped')); active.worker?.terminate().catch(() => {});
  }
  $('test-form').addEventListener('submit', async event => {
    event.preventDefault(); if (active || !selected.length) return;
    clearResult();
    const session = { worker: null, reason: '', reject: null, halt: null };
    session.halt = new Promise((_, reject) => { session.reject = reject; });
    active = session; controls(); message('Lokale Texterkennung wird vorbereitet …');
    const timer = setTimeout(() => { if (active === session) stop('timeout'); }, 180000);
    try {
      const T = await Promise.race([loadReader(), session.halt]);
      const base = new URL('assets/rekek/quantity-test/', document.baseURI).href;
      let index = 0;
      const creation = T.createWorker('deu', 1, {
        workerPath: base + 'vendor/worker.min.js', corePath: base + 'vendor/core', langPath: base + 'baseline',
        gzip: false, cacheMethod: 'none', workerBlobURL: false,
        logger: update => { if (active === session && !session.reason && update.status === 'recognizing text') message(`Foto ${index + 1} von ${selected.length} wird lokal gelesen … ${Math.round((update.progress || 0) * 100)} %`); }
      });
      creation.then(worker => { if (session.reason) worker.terminate().catch(() => {}); }, () => {});
      session.worker = await Promise.race([creation, session.halt]);
      await Promise.race([session.worker.setParameters({ tessedit_pageseg_mode: '3' }), session.halt]);
      const pages = [];
      for (index = 0; index < selected.length; index++) {
        const canvas = await Promise.race([canvasFor(selected[index]), session.halt]);
        try {
          const read = await Promise.race([session.worker.recognize(canvas), session.halt]);
          pages.push({ id: selected[index].id, raw: String(read.data.text || '') });
        } finally { canvas.width = canvas.height = 1; }
      }
      if (!pages.some(page => page.raw.trim())) throw Error('empty');
      const groups = $('same-recipe').checked ? [{ id: pages.map(page => page.id), text: pages.map(page => page.raw).join('\n') }] : pages.map(page => ({ id: [page.id], text: page.raw }));
      const recipes = groups.flatMap(group => window.RESERVE_REKEK.parseCandidates(group.text).candidates.map(draft => ({ ...draft, page_ids: group.id })));
      show({ reader: 'tesseract-local-deu', reviewRequired: true, verified: false, pages, recipes });
      message('Lokal gelesen. Die Abschrift ist ungeprüft; vergleiche alle Angaben mit deinen Fotos.');
      $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      clearResult();
      message(session.reason === 'timeout' ? 'Nach drei Minuten beendet. Versuche ein einzelnes, deutlicheres Foto.' : session.reason ? 'Lokales Lesen abgebrochen.' :
        error.message === 'empty' ? 'Kein Text erkannt. Bitte ein deutlicheres Foto oder einen näheren Ausschnitt versuchen.' :
        error.message === 'image_size' ? 'Das Foto ist zu gross. Bitte auf höchstens 25 Megapixel verkleinern.' :
        error.message === 'image_read' ? 'Das Foto konnte nicht geöffnet werden. Bitte neu als JPG oder PNG speichern.' :
        'Lokaler Leser konnte nicht gestartet oder abgeschlossen werden. Prüfe die Internetverbindung zum Laden der Lesedateien und versuche es später erneut.', true);
    } finally {
      clearTimeout(timer); await session.worker?.terminate().catch(() => {});
      if (active === session) { active = null; controls(); }
    }
  });
  cancel.addEventListener('click', () => stop('cancelled'));
  function clearAll() {
    stop('cleared'); photos.value = ''; $('same-recipe').checked = false;
    selected.forEach(page => URL.revokeObjectURL(page.url)); selected = []; nextId = 1;
    clearResult(); previews(); controls(); message('Fotos und Ergebnis wurden geleert.');
  }
  $('clear').addEventListener('click', clearAll); window.addEventListener('pagehide', clearAll);
  $('download').addEventListener('click', () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    const link = node('a'); link.href = url; link.download = 'rekek-lokal-pruefergebnis.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  controls();
})();
