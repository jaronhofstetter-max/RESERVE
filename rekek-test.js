/* Isolated owner diagnostic: fixed endpoint; no storage, analytics or automatic retries. */
(() => {
  'use strict';
  const endpoint = 'https://reserve-expiry-vision.jaronhofstetter.workers.dev/api/recipe-vision';
  const $ = id => document.getElementById(id);
  const token = $('token'), photos = $('photos'), submit = $('submit'), cancel = $('cancel');
  let selected = [], controller = null, result = null, nextId = 1;
  const validToken = () => /^[A-Za-z0-9_-]{32,128}$/.test(token.value.trim());
  const message = (text, error = false) => {
    $('status').textContent = text;
    $('status').dataset.error = String(error);
  };
  function controls() {
    const busy = !!controller;
    submit.disabled = busy || !selected.length || !validToken();
    photos.disabled = busy; token.disabled = busy; $('same-recipe').disabled = busy;
    $('clear').disabled = busy; cancel.hidden = !busy;
    document.querySelectorAll('[data-remove]').forEach(button => { button.disabled = busy; });
  }
  function clearResult() {
    result = null; $('recipes').replaceChildren(); $('results').hidden = true;
  }
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  function previews() {
    $('previews').replaceChildren();
    selected.forEach((page, index) => {
      const figure = node('figure', undefined, 'preview');
      const link = node('a'); link.href = page.url; link.target = '_blank'; link.rel = 'noopener';
      link.setAttribute('aria-label', `Seite ${index + 1} gross öffnen`);
      const image = node('img'); image.src = page.url; image.alt = `Original Seite ${index + 1}`;
      link.append(image);
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
  token.addEventListener('input', controls);
  $('same-recipe').addEventListener('change', clearResult);
  const read = file => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('image_read_failed')); reader.readAsDataURL(file);
  });
  const errors = {
    recipe_reader_not_enabled: 'Der Rezepttest ist noch ausgeschaltet. In Cloudflare REKEK_ENABLED auf 1 setzen und bereitstellen.',
    diagnostic_access_not_configured: 'Der Testzugang fehlt oder ist abgelaufen. In Cloudflare Token, REKEK_TEST_UNTIL und REKEK_LIMITER prüfen.',
    unauthorized: 'Der Zugangstoken stimmt nicht. Verwende den Wert von REKEK_ACCESS_TOKEN.',
    diagnostic_rate_limited: 'Zu viele Testanfragen. Warte mindestens eine Minute und starte bei Bedarf selbst erneut.',
    provider_rate_limited: 'OpenAI meldet ein Limit. Prüfe dort Guthaben und Limits, bevor du erneut startest.',
    key_not_configured: 'Der OpenAI-Schlüssel ist im Worker nicht eingerichtet.',
    model_not_configured: 'REKEK_MODEL ist im Worker nicht eingerichtet.',
    provider_http_error: 'OpenAI hat die Anfrage abgelehnt. Modellzugriff, Schlüssel und Guthaben müssen geprüft werden.',
    origin_not_allowed: 'Öffne diese Testseite direkt auf https://hofilight.ch/rekek-test.html.',
    images_too_large: 'Die Fotos sind zusammen zu gross. Bitte kleinere Bilder wählen.',
    request_too_large: 'Die Anfrage ist zu gross. Bitte weniger oder kleinere Fotos wählen.',
    invalid_image: 'Ein Fotoformat konnte nicht gelesen werden. Bitte JPG, PNG oder WebP verwenden.',
    image_type_mismatch: 'Der Dateiinhalt passt nicht zum Bildformat. Bitte das Foto als JPG oder PNG exportieren.',
    provider_timeout: 'Die Erkennung hat zu lange gedauert. Es wurde nicht automatisch erneut angefragt.',
    provider_refusal: 'Für diese Fotos wurde kein Ergebnis geliefert.',
    incomplete_provider_response: 'Die KI-Antwort ist unvollständig. Es wird kein Teilergebnis übernommen.'
  };
  function show(data) {
    if (!data || data.reviewRequired !== true || data.verified !== false || !Array.isArray(data.recipes)) throw new Error('invalid_result');
    const fragment = document.createDocumentFragment();
    for (const recipe of data.recipes) {
      if (!recipe || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.steps) || !Array.isArray(recipe.unclear) || !Array.isArray(recipe.page_ids)) throw new Error('invalid_result');
      const article = node('article', undefined, 'recipe');
      article.append(node('h3', recipe.title || 'Titel nicht lesbar'), node('p', `Portionen: ${recipe.portions ?? 'nicht angegeben / nicht lesbar'}`), node('p', `Quellseiten: ${recipe.page_ids.join(', ')}`, 'source'), node('h4', 'Zutaten'));
      if (!recipe.ingredients.length) article.append(node('p', 'Keine Zutaten erkannt.'));
      for (const row of recipe.ingredients) {
        const ingredient = node('div', undefined, 'ingredient');
        ingredient.append(node('strong', `${row.quantity ?? '[Menge offen]'} ${row.unit ?? '[Einheit offen]'} ${row.name ?? '[Zutat offen]'}`), node('p', `${row.page_id} · Quellzeile: ${row.source_line}`, 'source'));
        article.append(ingredient);
      }
      article.append(node('h4', 'Zubereitung'));
      const steps = node('ol'); recipe.steps.forEach(step => steps.append(node('li', step)));
      article.append(steps);
      if (!recipe.steps.length) article.append(node('p', 'Keine Zubereitung erkannt.'));
      if (recipe.unclear.length) {
        article.append(node('h4', 'Offene Stellen'));
        const unclear = node('ul'); recipe.unclear.forEach(text => unclear.append(node('li', text))); article.append(unclear);
      }
      fragment.append(article);
    }
    if (!data.recipes.length) fragment.append(node('p', 'Auf diesen Fotos wurde kein Rezept erkannt.'));
    $('recipes').replaceChildren(fragment); result = data; $('results').hidden = false;
  }
  $('test-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (controller || !selected.length || !validToken()) return;
    clearResult(); controller = new AbortController();
    const active = controller; let timedOut = false;
    controls(); message('Rezept wird gelesen … Bitte diese Seite geöffnet lassen.');
    const timer = setTimeout(() => { timedOut = true; active.abort(); }, 90000);
    try {
      const images = await Promise.all(selected.map(async page => ({ id: page.id, data_url: await read(page.file) })));
      active.signal.throwIfAborted();
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.value.trim()}` },
        body: JSON.stringify({ images, sameRecipe: $('same-recipe').checked }),
        signal: active.signal, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer'
      });
      let data;
      try { data = await response.json(); } catch { throw new Error('invalid_result'); }
      if (!response.ok) {
        message(errors[data?.error] || `Der Test ist fehlgeschlagen (HTTP ${response.status}). Es wurde nicht automatisch erneut angefragt.`, true);
      } else {
        show(data); message(`${data.recipes.length} Rezept(e) erkannt. Bitte unten mit den Originalfotos vergleichen.`);
        $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      clearResult();
      message(active.signal.aborted ? (timedOut ? 'Zeitlimit erreicht. Es wurde nicht automatisch erneut angefragt.' : 'Test abgebrochen. Eine bereits gestartete Verarbeitung kann trotzdem Kosten verursachen.') :
        error.message === 'invalid_result' ? 'Der Dienst hat kein gültiges Prüfergebnis geliefert.' :
        error.message === 'image_read_failed' ? 'Ein Foto konnte nicht geöffnet werden. Bitte neu auswählen.' :
        'Keine Verbindung zum Rezeptdienst. Internetverbindung und Worker prüfen. Es wurde nicht automatisch erneut angefragt.', true);
    } finally { clearTimeout(timer); controller = null; controls(); }
  });
  cancel.addEventListener('click', () => controller?.abort());
  function clearAll() {
    controller?.abort(); token.value = ''; photos.value = ''; $('same-recipe').checked = false;
    selected.forEach(page => URL.revokeObjectURL(page.url)); selected = []; nextId = 1;
    clearResult(); previews(); controls(); message('Token, Fotos und Ergebnis wurden geleert.');
  }
  $('clear').addEventListener('click', clearAll);
  window.addEventListener('pagehide', clearAll);
  $('download').addEventListener('click', () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    const link = node('a'); link.href = url; link.download = 'rekek-pruefergebnis.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  token.value = ''; controls();
})();
