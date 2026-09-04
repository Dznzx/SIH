/* CivicSetu — photo triage: CNN category suggestion + severity estimate.

   What this actually does, honestly:
   - Category suggestion: runs a real MobileNet v1 CNN (TensorFlow.js,
     self-hosted in js/vendor/ — no CDN dependency, fits the app's
     offline-first design) over the captured photo. MobileNet is trained
     on ImageNet's 1000 general object classes, which has no "pothole" or
     "handpump" class — there is no public civic-infrastructure-labelled
     model to drop in here. So this maps a short list of the closest
     ImageNet proxy classes (manhole cover -> Pothole, ashcan/garbage
     truck/plastic bag -> Garbage, traffic light/street sign ->
     Streetlight, water tower/gas pump/fountain -> Handpump) onto our 4
     categories. Treat the suggestion as assistive, not authoritative: it
     pre-selects a category chip but the citizen can always tap a
     different one, and low-confidence or unmapped predictions suggest
     nothing rather than guessing.
   - Severity: there is no labelled severity dataset to train a regressor
     on, so this is NOT a learned severity model. It's a simple image
     heuristic (edge density = visual "damage texture", plus overall
     darkness, computed via canvas pixel analysis) blended with the
     category's typical baseline severity. It's a reasonable proxy signal,
     not a certified damage assessment — the priority queue's "Why this
     rank?" panel is what keeps this honest downstream.
   - If the model can't load (offline, blocked request, slow connection),
     everything degrades gracefully to the heuristic-only path with no
     category suggestion — the existing manual-chip-selection flow keeps
     working exactly as before this file existed.
*/
const CivicML = (function(){

  const IMAGENET_TO_CATEGORY = [
    { keywords: ['manhole cover'], category: 'Pothole' },
    { keywords: ['ashcan', 'trash can', 'garbage can', 'wastebin', 'dustbin', 'garbage truck', 'plastic bag'], category: 'Garbage' },
    { keywords: ['traffic light', 'street sign'], category: 'Streetlight' },
    { keywords: ['water tower', 'gas pump', 'fountain', 'water jug', 'water bottle'], category: 'Handpump' },
  ];
  const CONFIDENCE_FLOOR = 0.12; // below this, MobileNet's guess isn't worth surfacing at all

  let modelPromise = null;
  function loadModel(){
    if(modelPromise) return modelPromise;
    modelPromise = (async ()=>{
      if(typeof tf === 'undefined' || typeof mobilenet === 'undefined'){
        throw new Error('tfjs/mobilenet script not present');
      }
      // version:1, alpha:0.25 = the smallest/fastest MobileNet variant —
      // good enough for a coarse assistive suggestion, and quicker to
      // fetch the remaining weight shards on a slow connection than the
      // full-size model.
      return await mobilenet.load({ version: 1, alpha: 0.25 });
    })();
    return modelPromise;
  }
  // Fire the load in the background the first time this script runs, so
  // it's likely warm by the time the citizen actually captures a photo —
  // but never block anything on it.
  if(typeof window !== 'undefined'){
    setTimeout(()=>{ loadModel().catch(()=>{ /* handled per-call below */ }); }, 0);
  }

  function suggestCategory(predictions){
    for(const p of predictions){
      const label = p.className.toLowerCase();
      for(const rule of IMAGENET_TO_CATEGORY){
        if(rule.keywords.some(k=>label.includes(k))){
          return { category: rule.category, confidence: p.probability, matchedLabel: p.className };
        }
      }
    }
    return null;
  }

  // Downscales the image onto a small canvas and computes two cheap,
  // real signals from actual pixel data: mean luminance (darkness) and
  // mean gradient magnitude (edge density, i.e. visual "busyness" —
  // cracked/broken surfaces and debris pile texture read higher than a
  // clean flat one).
  function imageHeuristics(img){
    const w = 64, h = 64;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const gray = new Float32Array(w * h);
    let sumLum = 0;
    for(let i = 0; i < w*h; i++){
      const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
      const l = 0.299*r + 0.587*g + 0.114*b;
      gray[i] = l;
      sumLum += l;
    }
    const meanLum = sumLum / (w*h);
    let edgeSum = 0, edgeCount = 0;
    for(let y = 1; y < h-1; y++){
      for(let x = 1; x < w-1; x++){
        const idx = y*w + x;
        const gx = gray[idx+1] - gray[idx-1];
        const gy = gray[idx+w] - gray[idx-w];
        edgeSum += Math.sqrt(gx*gx + gy*gy);
        edgeCount++;
      }
    }
    const edgeDensity = edgeSum / edgeCount;
    return {
      edgeNorm: Math.min(1, edgeDensity / 35),        // 0=flat/uniform, 1=visually chaotic
      darkNorm: Math.min(1, Math.max(0, (150 - meanLum) / 150)), // 0=bright, 1=dark (shadowed holes, standing water)
    };
  }

  function estimateSeverity(categoryBaseline, heuristics){
    const raw = 0.45*categoryBaseline + 0.35*heuristics.edgeNorm + 0.20*heuristics.darkNorm;
    return Math.max(0.15, Math.min(0.97, Number(raw.toFixed(2))));
  }

  // categoryBaseline: the app's existing DEFAULT_SEVERITY[category] prior
  // (used both as a fallback if analysis fails, and blended into the
  // estimate above). Returns null fields for anything that couldn't be
  // computed rather than fabricating a confident-looking number.
  async function analyzePhoto(dataUrl, categoryBaseline){
    const img = await new Promise((resolve, reject)=>{
      const el = new Image();
      el.onload = ()=>resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });

    let heuristics;
    try{
      heuristics = imageHeuristics(img);
    } catch(e){
      heuristics = { edgeNorm: 0.5, darkNorm: 0.5 }; // canvas read blocked — neutral midpoint, not a guess dressed as data
    }

    let suggestion = null;
    let source = 'heuristic';
    let topPrediction = null;
    try{
      const model = await Promise.race([
        loadModel(),
        new Promise((_, reject)=> setTimeout(()=>reject(new Error('model load timeout')), 6000))
      ]);
      const predictions = await model.classify(img, 5);
      if(predictions[0]) topPrediction = { className: predictions[0].className, probability: predictions[0].probability };
      const hit = suggestCategory(predictions);
      if(hit && hit.confidence >= CONFIDENCE_FLOOR){
        suggestion = hit;
        source = 'cnn';
      }
    } catch(e){
      // Offline, blocked weight fetch, or timed out — fall through with
      // no category suggestion. This is expected and fine, not an error
      // state the citizen needs to see.
    }

    const baseline = (typeof categoryBaseline === 'number') ? categoryBaseline : 0.5;
    const severity = estimateSeverity(baseline, heuristics);
    const relevance = checkRelevance(topPrediction);

    return { suggestion, severity, source, relevance };
  }

  // Photo relevance check — "does this even look like a civic issue?"
  // There is no vision LLM available on this project's Groq tier/account
  // (tried meta-llama/llama-4-scout, confirmed 404 model_not_found; the
  // account's full model list has zero multimodal models right now), so
  // this reuses the same on-device MobileNet classification already run
  // above instead of a second network round trip that would just fail.
  // MobileNet has no "pothole"/"garbage" class to positively confirm
  // relevance against (see file header), so this only flags the opposite:
  // high-confidence predictions of things that are obviously NOT a civic
  // issue. Low-confidence or ambiguous predictions stay silent — a missed
  // warning is far better than wrongly flagging a real, legitimate photo.
  const CLEARLY_UNRELATED = [
    'cat','kitten','tabby','persian cat','siamese cat','egyptian cat',
    'dog','puppy','retriever','terrier','spaniel','poodle','shepherd','husky',
    'bird','hen','cock','peacock','parrot','ostrich',
    'person','groom','bridegroom',
    'laptop','notebook computer','desktop computer','computer keyboard','computer mouse',
    'cellular telephone','remote control','television','monitor','screen',
    'plate','pizza','ice cream','cheeseburger','hot dog','banana','orange','pretzel','bagel','soup bowl',
    'necktie','bow tie','sunglasses','sunglass','sombrero','cowboy hat',
    'guitar','piano','violin','trumpet','drum',
    'sports car','racer','convertible','limousine',
    'teddy bear','rubber eraser','pencil sharpener','ballpoint',
    'book jacket','comic book','menu','website',
    'sofa','couch','four-poster','studio couch',
    'coffee mug','cup','teapot','wine bottle','beer bottle'
  ];
  const RELEVANCE_CONFIDENCE_FLOOR = 0.35;
  function checkRelevance(topPrediction){
    if(!topPrediction || topPrediction.probability < RELEVANCE_CONFIDENCE_FLOOR) return null;
    const label = topPrediction.className.toLowerCase();
    const match = CLEARLY_UNRELATED.find(k => label.includes(k));
    if(!match) return null;
    return { likelyUnrelated: true, detected: topPrediction.className, confidence: topPrediction.probability };
  }

  return { analyzePhoto, loadModel };
})();
