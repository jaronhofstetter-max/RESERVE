/* RESERVE barcode mobile focus fix v1.0 — prevent Android freezes from automatic focus/smooth-scroll after unknown barcode capture. */
(function(){
  'use strict';
  const originalFocus=HTMLInputElement.prototype.focus;
  const originalScroll=Element.prototype.scrollIntoView;
  HTMLInputElement.prototype.focus=function(options){
    if(this?.id==='scanName' && document.getElementById('barcodeResult')?.textContent?.includes('Neues Produkt')) return;
    return originalFocus.call(this,options);
  };
  Element.prototype.scrollIntoView=function(options){
    if(this?.id==='scanName' && document.getElementById('barcodeResult')?.textContent?.includes('Neues Produkt')) return;
    return originalScroll.call(this,options);
  };
  window.RESERVE_BARCODE_MOBILE_FOCUS_FIX={version:'1.0'};
})();
