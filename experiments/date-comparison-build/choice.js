export function choose(base,extra){return base.candidates.length?{prediction:base,usedFallback:false}:{prediction:extra||base,usedFallback:!!extra};}
