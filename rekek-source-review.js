/* Review only: original OCR is immutable; no writes to recipe or inventory stores. */
(() => {
  'use strict';
  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  const norm = s => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
  function mount(host, exportHost, data, photos) {
    let disposed = false, displayVersion = 0, sequence = 0;
    const original = structuredClone(data), fields = [], pageChecks = [], removed = [], excludedRecipes = [];
    const layout = el('div', undefined, 'review-layout'), source = el('aside', undefined, 'source-view');
    const editor = el('div', undefined, 'review-editor');
    let returnTarget = null;
    const back = el('button', 'Zur gewählten Angabe', 'secondary'); back.type = 'button'; back.hidden = true;
    back.addEventListener('click', () => returnTarget?.scrollIntoView({block:'center'}));
    const pageLabel = el('label', 'Originalseite'), pageSelect = el('select'); pageSelect.setAttribute('aria-label', 'Originalseite');
    data.pages.forEach((p, i) => { const o = el('option', `Seite ${i + 1} · ${p.id}`); o.value = p.id; pageSelect.append(o); });
    pageLabel.append(pageSelect);
    const imageLink = el('a', 'Original gross öffnen'); imageLink.target = '_blank'; imageLink.rel = 'noopener';
    const image = el('img'); image.alt = 'Gewählte Originalseite';
    const crop = el('canvas'); crop.hidden = true; crop.setAttribute('role', 'img'); crop.setAttribute('aria-label', 'Gewählte OCR-Zeile im Original');
    const caption = el('p', '', 'source');
    source.append(el('h3', 'Am Original vergleichen'), pageLabel, imageLink, image, crop, caption, back);
    layout.append(source, editor); host.replaceChildren(layout);
    async function display(pageId, lineId) {
      const version = ++displayVersion, p = data.pages.find(p => p.id === pageId), photo = photos.find(p => p.id === pageId);
      crop.hidden = true;
      if (!p || !photo || disposed) return;
      pageSelect.value = pageId; image.src = photo.url; imageLink.href = photo.url;
      const line = p.lines?.find(l => l.id === lineId), b = line?.bbox;
      caption.textContent = line ? `OCR-Zeile: ${line.raw}` : 'Gesamte Seite prüfen, auch Text, den die Erkennung ausgelassen hat.';
      if (!b || ![b.x0,b.y0,b.x1,b.y1,p.width,p.height].every(Number.isFinite) || p.width <= 0 || p.height <= 0 || b.x1 <= b.x0 || b.y1 <= b.y0) return;
      const picture = new Image(); picture.src = photo.url;
      try { await picture.decode(); } catch { return; }
      if (disposed || version !== displayVersion) return;
      const sx = picture.naturalWidth / p.width, sy = picture.naturalHeight / p.height;
      const x = Math.max(0, Math.floor(b.x0 * sx) - 8), y = Math.max(0, Math.floor(b.y0 * sy) - 8);
      const w = Math.min(picture.naturalWidth - x, Math.ceil((b.x1 - b.x0) * sx) + 16);
      const h = Math.min(picture.naturalHeight - y, Math.ceil((b.y1 - b.y0) * sy) + 16);
      if (w <= 0 || h <= 0) return;
      crop.width = w; crop.height = h; crop.getContext('2d').drawImage(picture, x, y, w, h, 0, 0, w, h); crop.hidden = false;
    }
    pageSelect.addEventListener('change', () => display(pageSelect.value));
    const progress = el('p', '', 'review-progress'); progress.setAttribute('role', 'status');
    const download = el('button', 'Bestätigte Prüfabschrift herunterladen'); download.type = 'button'; download.id = 'download-reviewed';
    exportHost.append(progress, download, el('p', 'Bestätigungen sind menschliche Prüfungen und können Fehler enthalten. Kein automatisches Speichern in RESERVE.', 'hint'));
    function update() {
      const live = fields.filter(f => !f.removed), checked = live.filter(f => f.check.checked && f.valid()).length;
      const pagesDone = pageChecks.filter(c => c.checked).length;
      progress.textContent = `${checked} von ${live.length} Angaben geprüft · ${pagesDone} von ${pageChecks.length} Seiten vollständig geprüft`;
      download.disabled = !recipes.some(r => !r.removed) || recipes.filter(r=>!r.removed).some(r => !r.fields.some(f => !f.removed && f.kind === 'ingredient' && f.valid())) || checked !== live.length || pagesDone !== pageChecks.length;
    }
    function invalidatePages() { pageChecks.forEach(c => { c.checked = false; }); }
    function field(parent, kind, value, pageIds, section = '', removable = false) {
      const id = `review-field-${++sequence}`, box = el('div', undefined, `review-field ${kind === 'ingredient' ? 'ingredient' : ''}`);
      const label = el('label', {title:'Titel',portions:'Personen / Portionen (leer, falls unbekannt)',ingredient:'Zutat mit Menge und Einheit',steps:'Zubereitung mit Zeiten und Temperaturen',unresolved:'Offene Stelle / Klärung'}[kind]);
      const input = el('textarea'); input.rows = kind === 'steps' ? 5 : 2; input.value = String(value || ''); input.id = id; label.htmlFor = id;
      const originalText = el('details'), originalSummary = el('summary', 'Ursprüngliche Lesung'); originalText.append(originalSummary, el('pre', String(value || '')));
      const sectionLabel = el('label', 'Abschnitt (z. B. Teig oder Füllung)'), sectionInput = el('input'); sectionInput.value = section; sectionInput.type = 'text'; sectionInput.setAttribute('aria-label', 'Zutatenabschnitt'); sectionLabel.append(sectionInput);
      const sourceLabel = el('label', 'Mit dieser Quelle vergleichen'), select = el('select'); select.setAttribute('aria-label', 'Quellzeile');
      const choices = [];
      for (const p of data.pages.filter(p => pageIds.includes(p.id))) {
        choices.push({value:p.id, page_id:p.id, line_id:null, label:`${p.id} · ganze Seite / keine passende OCR-Zeile`});
        for (const line of p.lines || []) choices.push({value:line.id,page_id:p.id,line_id:line.id,label:`${p.id} · ${line.raw}`});
      }
      choices.forEach(c => { const o = el('option', c.label); o.value = c.value; select.append(o); }); sourceLabel.append(select);
      const matches = choices.filter(c => c.line_id && norm(data.pages.find(p=>p.id===c.page_id).lines.find(l=>l.id===c.line_id).raw) === norm(value));
      if (matches.length === 1) select.value = matches[0].value;
      const show = el('button', 'Quelle anzeigen', 'secondary'); show.type = 'button';
      const checkLabel = el('label', undefined, 'check'), check = el('input'); check.type = 'checkbox'; check.className = 'field-confirm';
      checkLabel.append(check, document.createTextNode(kind === 'ingredient' ? 'Menge, Einheit, Zutat und Abschnitt am Original geprüft' : 'Diese Angabe am Original geprüft; Unleserliches ausdrücklich markiert'));
      const reading = el('p', '', 'source');
      function readingUpdate() {
        if (kind !== 'ingredient') return;
        const parsed = window.RESERVE_RECIPE_PARSER.ingredient(input.value);
        reading.textContent = parsed.amount === null ? 'Menge offen · am Foto prüfen' : `Gelesene Menge: ${parsed.amount} ${parsed.unit || '[Einheit offen]'} · am Foto prüfen`;
      }
      box.append(label, input); if (kind === 'ingredient') box.append(sectionLabel, reading);
      box.append(originalText, sourceLabel, show, checkLabel); parent.append(box);
      const f = {id,kind,input,sectionInput,select,check,original:String(value || ''),removed:false,choices,
        valid:() => (kind === 'portions' || input.value.trim().length > 0) && choices.some(c=>c.value===select.value)};
      fields.push(f);
      const changed = () => { check.checked = false; invalidatePages(); readingUpdate(); update(); };
      input.addEventListener('input', changed); sectionInput.addEventListener('input', changed);
      select.addEventListener('change', () => { changed(); const c=choices.find(c=>c.value===select.value); if(c)display(c.page_id,c.line_id); });
      show.addEventListener('click', () => { const c=choices.find(c=>c.value===select.value); if(c){display(c.page_id,c.line_id);returnTarget=box;back.hidden=false;source.scrollIntoView({block:'start'});} });
      check.addEventListener('change', update);
      if (removable) {
        const remove = el('button', 'Fehlzuordnung entfernen', 'secondary'); remove.type = 'button';
        remove.addEventListener('click', () => { f.removed = true; removed.push({id,kind,original:f.original,edited:input.value,reason:'user_removed'}); box.remove(); invalidatePages(); update(); }); box.append(remove);
      }
      readingUpdate(); return f;
    }
    const recipes = [];
    function addRecipe(draft, pageIds) {
      const article = el('article', undefined, 'recipe');
      article.append(el('h3', `Rezept ${recipes.length + 1}`), el('p', `Quellseiten: ${pageIds.join(', ')}`, 'source'));
      const record = {page_ids:pageIds, fields:[], removed:false}; recipes.push(record); editor.append(article);
      record.fields.push(field(article,'title',draft.name,pageIds), field(article,'portions',draft.portions,pageIds));
      const ingredients = el('div'); article.append(el('h4', 'Zutaten'), ingredients);
      const sectionRows = (draft.ingredientSections || []).flatMap(s => s.lines.map(text => ({text,section:s.name})));
      for (const line of String(draft.ingredients || '').split('\n').filter(Boolean)) {
        let section = '';
        const sourceIndex = sectionRows.findIndex(row => row.text === line);
        if (sourceIndex >= 0) section = sectionRows.splice(sourceIndex,1)[0].section;
        record.fields.push(field(ingredients,'ingredient',line,pageIds,section,true));
      }
      const add = el('button', '+ Fehlende Zutat ergänzen', 'secondary'); add.type = 'button';
      add.addEventListener('click', () => { record.fields.push(field(ingredients,'ingredient','',pageIds,'',true)); invalidatePages(); update(); }); article.append(add);
      record.fields.push(field(article,'steps',draft.steps,pageIds));
      for (const item of draft.unresolved || []) record.fields.push(field(article,'unresolved',item.raw,pageIds,'',true));
      const removeRecipe = el('button','Diese Rezeptfehlzuordnung entfernen','secondary'); removeRecipe.type='button';
      removeRecipe.addEventListener('click',()=>{
        record.removed=true;
        excludedRecipes.push({page_ids:pageIds,reason:'user_removed_recipe',fields:record.fields.filter(f=>!f.removed).map(f=>({kind:f.kind,original:f.original,edited:f.input.value}))});
        record.fields.forEach(f=>{f.removed=true;});article.remove();invalidatePages();update();
      });article.append(removeRecipe);
      return record;
    }
    data.recipes.forEach(draft => addRecipe(draft, draft.page_ids));
    const addLabel = el('label','Fehlendes Rezept auf Seite'), addPage = pageSelect.cloneNode(true); addPage.setAttribute('aria-label','Seite für fehlendes Rezept'); addLabel.append(addPage);
    if(data.continuation_pages && data.pages.length > 1){const all=el('option','Alle gewählten Folgeseiten');all.value='all-pages';addPage.prepend(all);addPage.value='all-pages';}
    const addRecipeButton = el('button','+ Fehlendes Rezept ergänzen','secondary'); addRecipeButton.type = 'button';
    addRecipeButton.addEventListener('click', () => { addRecipe({},addPage.value==='all-pages'?data.pages.map(p=>p.id):[addPage.value]); invalidatePages(); update(); });
    editor.append(addLabel,addRecipeButton);
    const complete = el('div',undefined,'page-completeness'); complete.append(el('h3','Auf Auslassungen prüfen'));
    data.pages.forEach((p,i) => {
      const label = el('label',undefined,'check'), c=el('input'); c.type='checkbox'; c.className='page-confirm';
      label.append(c,document.createTextNode(`Seite ${i+1}: alle Rezepte, Zutaten, Abschnitte und Schritte mit dem ganzen Original verglichen; Fehlendes ergänzt oder ausdrücklich als unleserlich markiert.`));
      const show=el('button',`Seite ${i+1} ansehen`,'secondary');show.type='button';show.addEventListener('click',()=>{display(p.id);returnTarget=label;back.hidden=false;source.scrollIntoView({block:'start'});});
      complete.append(label,show);pageChecks.push(c);c.addEventListener('change',update);
    });editor.append(complete);
    download.addEventListener('click', () => {
      update(); if(download.disabled || disposed)return;
      const serial = f => ({id:f.id,kind:f.kind,original:f.original,text:f.input.value,section:f.kind==='ingredient'?f.sectionInput.value:undefined,
        source: (()=>{const c=f.choices.find(c=>c.value===f.select.value);return {page_id:c.page_id,line_id:c.line_id};})(),human_confirmed:true,
        parsed_reading:f.kind==='ingredient'?window.RESERVE_RECIPE_PARSER.ingredient(f.input.value):undefined});
      const payload = {...original,verified:false,review:{schema:'rekek-source-review-v1',status:'human_confirmed',fallible:true,
        note:'Menschlich geprüft; keine Garantie für Fehlerfreiheit. Parserwerte bleiben maschinelle Lesungen. Kein automatischer Import.',
        pages:data.pages.map((p,i)=>({page_id:p.id,completeness_confirmed:pageChecks[i].checked})),removed,excluded_recipes:excludedRecipes,
        recipes:recipes.filter(r=>!r.removed).map(r=>({page_ids:r.page_ids,fields:r.fields.filter(f=>!f.removed).map(serial)}))}};
      const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='rekek-bestaetigte-pruefabschrift.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    display(data.pages[0]?.id);update();
    return {destroy(){disposed=true;displayVersion++;host.replaceChildren();exportHost.replaceChildren();}};
  }
  window.RESERVE_SOURCE_REVIEW = Object.freeze({mount});
})();
