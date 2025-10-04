// tts-section.js
// Lightweight module to initialize the TTS section inside a page.
(function(){
  function $(sel, root=document){ return root.querySelector(sel); }

  function addNaturalPauses(text){
    return text.replace(/\s+/g,' ').trim();
  }

  function formatTime(seconds){
    const mins = Math.floor(seconds/60);
    const secs = Math.floor(seconds%60);
    return `${mins}:${secs.toString().padStart(2,'0')}`;
  }

  function init(root){
    const rootEl = (typeof root === 'string') ? document.querySelector(root) : root;
    if(!rootEl) return console.warn('TTS: root not found', root);

    const textInput = $( '#tts-text-input', rootEl );
    const wordCountEl = $( '#tts-wordcount', rootEl );
  const playBtn = $( '#tts-play', rootEl ); // single toggle button now
    const statusEl = $( '#tts-status', rootEl );
    const progressEl = $( '#tts-progress', rootEl );
    const currentEl = $( '#tts-current', rootEl );
    const totalEl = $( '#tts-total', rootEl );
  const volumeEl = $( '#tts-volume', rootEl );
  const speedEl = $( '#tts-speed', rootEl );
  const volumeValEl = $( '#tts-volume-val', rootEl );
  const speedValEl = $( '#tts-speed-val', rootEl );

  let isPlaying=false, isPaused=false, utter=null, speechDuration=0, startTs=0, intervalId=null, playSessionId=0;
  let pendingRestartTimer=null, lastAdjustPct=0, lastAdjustWasPlaying=false;
  let selectedGender=null, voicesLoaded=false, voiceList=[];
  // Voice selection removed per request – using system default voice

    function updateWordCount(){
      if(!textInput) return;
      const words = textInput.value.trim().split(/\s+/).filter(Boolean);
      const count = words.length;
      wordCountEl.textContent = count;
  playBtn.disabled = !(count>0 && count<=5000);
      if(count>5000){ statusEl.textContent = 'Maximum 5000 words allowed'; }
      else if(count===0){ statusEl.textContent = 'Enter text to convert to speech'; }
      else{ statusEl.textContent = 'Ready'; }
    }

    function calcDuration(text){
      const words = text.split(/\s+/).filter(Boolean).length;
      const wpm = 150 * (parseFloat(speedEl.value)||1);
      return (words / wpm) * 60; // seconds
    }

    // Removed voice population code

    function updateProgress(){
      if(!speechDuration || speechDuration<=0) return;
      const elapsed = Math.max(0,(Date.now()-startTs)/1000);
      const pct = Math.min((elapsed/speechDuration)*100,100);
      if(progressEl) {
        progressEl.style.width = pct+'%';
        const handle = rootEl.querySelector('#tts-progress-handle');
        if(handle){
          handle.setAttribute('aria-valuenow', pct.toFixed(1));
          handle.setAttribute('aria-valuetext', formatTime(elapsed));
        }
      }
      if(currentEl) currentEl.textContent = formatTime(Math.min(elapsed,speechDuration));
      if(totalEl) totalEl.textContent = formatTime(speechDuration);
    }

    function startProgress(){ intervalId = setInterval(updateProgress,200); }
    function stopProgress(){ if(intervalId) clearInterval(intervalId); intervalId=null; }

    function startUtterFromPercent(pct){
      if(!textInput) return;
      const raw = textInput.value.trim();
      if(!raw) return;
      const words = raw.split(/\s+/).filter(Boolean);
      const targetIndex = Math.min(words.length, Math.floor(words.length * pct));
      const remainingWords = words.slice(targetIndex).join(' ');
      // Cancel any current speech
      window.speechSynthesis.cancel();
      utter = new SpeechSynthesisUtterance(addNaturalPauses(remainingWords));
      utter.rate = parseFloat(speedEl.value)||1;
      utter.volume = (parseFloat(volumeEl.value)||80)/100;
      utter.pitch = 1.05;
      // Attempt gender-based voice selection if available
      if(selectedGender && voicesLoaded){
        const genderRegex = selectedGender==='male' ? /(male|david|mark|john|matthew|george|james|michael|daniel)/i : /(female|zira|susan|emma|amy|samantha|linda|karen|victoria|sara|jenny|anna)/i;
        const matches = voiceList.filter(v=> genderRegex.test(v.name));
        if(matches.length>0) utter.voice = matches[0];
        else if(voiceList.length>0) utter.voice = voiceList[0];
      }
      const sessionId = ++playSessionId;
      const seekElapsed = speechDuration * pct; // seconds already elapsed logically
      utter.onstart = function(){
        isPlaying=true; isPaused=false; startTs = Date.now() - seekElapsed*1000; statusEl.textContent='Speaking...'; startProgress();
        if(playBtn){ playBtn.textContent='Pause'; playBtn.dataset.state='playing'; playBtn.disabled=false; }
      };
      utter.onend = function(){
        // Ignore stale onend events from older sessions
        if(sessionId !== playSessionId) return;
        isPlaying=false; isPaused=false; stopProgress(); statusEl.textContent='Completed'; if(playBtn){ playBtn.textContent='Play'; playBtn.dataset.state='ready'; playBtn.disabled=false; }
        if(progressEl) progressEl.style.width='100%';
      };
      utter.onerror = function(e){ if(sessionId !== playSessionId) return; console.error('TTS error', e); isPlaying=false; isPaused=false; stopProgress(); statusEl.textContent='Error during speech'; if(playBtn){ playBtn.textContent='Play'; playBtn.dataset.state='ready'; playBtn.disabled=false; } };
      window.speechSynthesis.speak(utter);
    }

    function play(){
      if(!textInput) return;
      const text = textInput.value.trim();
      if(!text) return;
      // If no gender chosen yet show modal instead of starting
      if(!selectedGender){
        const modal = document.getElementById('tts-voice-modal');
        if(modal){ modal.classList.remove('hidden'); modal.querySelector('[data-voice-gender]')?.focus(); }
        return;
      }
      speechDuration = calcDuration(text);
      startUtterFromPercent(0);
    }

    // Live update volume/speed while speaking
    function updateRangeDisplays(){
      if(volumeValEl && volumeEl) volumeValEl.textContent = `${volumeEl.value}%`;
      if(speedValEl && speedEl) speedValEl.textContent = `${parseFloat(speedEl.value).toFixed(1)}x`;
    }
    updateRangeDisplays();
    function scheduleRestart(){
      if(!lastAdjustWasPlaying) return; // only restart if we were playing before adjustment
      if(pendingRestartTimer) clearTimeout(pendingRestartTimer);
      statusEl.textContent='Applying changes...';
      pendingRestartTimer = setTimeout(()=>{
        pendingRestartTimer=null;
        startUtterFromPercent(lastAdjustPct);
      },1000); // 1s pause before resuming
    }

    if(volumeEl) volumeEl.addEventListener('input', () => {
      updateRangeDisplays();
      if(speechDuration>0){
        const nowElapsed = (Date.now()-startTs)/1000;
        const pct = speechDuration? Math.min(Math.max(nowElapsed / speechDuration,0),1):0;
        lastAdjustPct = pct;
        lastAdjustWasPlaying = isPlaying && !isPaused;
        if(isPlaying){
          // Invalidate current session so its onend won't mark Completed
          playSessionId++;
          window.speechSynthesis.cancel();
          isPlaying=false; isPaused=false; stopProgress();
        }
        // Keep visual progress where it was
        if(progressEl) progressEl.style.width = (pct*100)+'%';
        // volume change to be applied on restart; no immediate utter.volume since we cancelled.
        scheduleRestart();
      }
    });
    if(speedEl) speedEl.addEventListener('input', () => {
      // capture current pct BEFORE recalculating duration
      const elapsed = (Date.now()-startTs)/1000;
      const pct = speechDuration>0 ? Math.min(elapsed / speechDuration, 1) : 0;
      lastAdjustPct = pct;
      lastAdjustWasPlaying = isPlaying && !isPaused;
      if(isPlaying){
        playSessionId++;
        window.speechSynthesis.cancel();
        isPlaying=false; isPaused=false; stopProgress();
      }
      // update speechDuration based on new speed value
      speechDuration = calcDuration(textInput ? textInput.value : '');
      if(totalEl) totalEl.textContent = formatTime(speechDuration);
      updateRangeDisplays();
      if(progressEl) progressEl.style.width = (pct*100)+'%';
      scheduleRestart();
    });

    // Keyboard shortcuts: Space = Play/Pause, S = Stop, R = Replay
    rootEl.addEventListener('keydown', (e) => {
      // Only handle keyboard when focus is inside the TTS section
      if(!rootEl.contains(document.activeElement)) return;
      if(e.code === 'Space'){
        e.preventDefault();
        if(window.speechSynthesis.paused) resume(); else if(window.speechSynthesis.speaking) pause(); else play();
      } else if(e.key.toLowerCase() === 's'){
        stop();
      } else if(e.key.toLowerCase() === 'r'){
        replay();
      }
    });

    function pause(){ if(window.speechSynthesis.speaking && !window.speechSynthesis.paused){ window.speechSynthesis.pause(); isPaused=true; stopProgress(); statusEl.textContent='Paused'; if(playBtn){ playBtn.textContent='Play'; playBtn.dataset.state='paused'; }} }
    function resume(){ if(window.speechSynthesis.paused){ window.speechSynthesis.resume(); isPaused=false; startProgress(); statusEl.textContent='Speaking...'; if(playBtn){ playBtn.textContent='Pause'; playBtn.dataset.state='playing'; }} }
    function stop(){ window.speechSynthesis.cancel(); isPlaying=false; isPaused=false; stopProgress(); if(progressEl) progressEl.style.width='0%'; if(currentEl) currentEl.textContent='0:00'; if(totalEl) totalEl.textContent=formatTime(calcDuration(textInput?textInput.value:'')); statusEl.textContent='Stopped'; if(playBtn){ playBtn.textContent='Play'; playBtn.dataset.state='ready'; playBtn.disabled=false; }}
    function replay(){ stop(); setTimeout(()=>{ play(); },200); }

    // Events
    if(textInput){ textInput.addEventListener('input', updateWordCount); updateWordCount(); }
    if(playBtn) playBtn.addEventListener('click', ()=>{
      const state = playBtn.dataset.state;
      if(state==='playing'){ pause(); }
      else if(state==='paused'){ resume(); }
      else { play(); }
    });

    // Voice modal hook (only once per root page)
    const modal = document.getElementById('tts-voice-modal');
    if(modal){
      modal.addEventListener('click', (e)=>{
        if(e.target === modal){ modal.classList.add('hidden'); }
      });
      modal.querySelectorAll('.voice-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          selectedGender = btn.getAttribute('data-voice-gender');
          modal.classList.add('hidden');
          modal.dataset.voiceChosen = 'true';
          // Load voices if not yet loaded
          if(window.speechSynthesis){
            voiceList = window.speechSynthesis.getVoices();
            if(voiceList.length===0){
              // Chrome async load
              window.speechSynthesis.onvoiceschanged = function(){ voiceList = window.speechSynthesis.getVoices(); voicesLoaded=true; };
            } else { voicesLoaded=true; }
          }
          // Auto-start after selection if user had clicked play
          // Autoplay only if user had attempted to play (we can detect if status said Applying changes or Ready and playBtn not in playing/paused but a pending request) – simplest: start only if text present and not already playing
          if(playBtn && playBtn.dataset.state==='ready'){
            const txt = textInput ? textInput.value.trim() : '';
            if(txt) play();
          }
        });
      });
    }

    // Enhanced seek: click or drag
    const progressWrap = rootEl.querySelector('.tts-progress-bar');
    let dragActive = false, dragPct = 0, wasPlayingBeforeDrag=false;
    function pctFromEvent(e, el){ const r = el.getBoundingClientRect(); return (e.clientX-r.left)/r.width; }
    function previewSeek(pct){
      pct = Math.max(0, Math.min(1,pct));
      dragPct = pct;
      if(progressEl) progressEl.style.width = (pct*100)+'%';
      const elapsed = speechDuration * pct;
      if(currentEl) currentEl.textContent = formatTime(elapsed);
      const handle = rootEl.querySelector('#tts-progress-handle');
      if(handle){ handle.setAttribute('aria-valuenow',(pct*100).toFixed(1)); handle.setAttribute('aria-valuetext', formatTime(elapsed)); }
    }
    if(progressWrap){
      progressWrap.addEventListener('mousedown', (e)=>{
        if(speechDuration<=0) return;
        dragActive = true; wasPlayingBeforeDrag = isPlaying && !isPaused;
        if(isPlaying){ playSessionId++; }
        window.speechSynthesis.cancel(); // stop current speech while dragging
        isPlaying=false; isPaused=false; stopProgress(); statusEl.textContent='Seeking...';
        previewSeek(pctFromEvent(e, progressWrap));
      });
      window.addEventListener('mousemove', (e)=>{ if(!dragActive) return; previewSeek(pctFromEvent(e, progressWrap)); });
      window.addEventListener('mouseup', ()=>{
        if(!dragActive) return;
        dragActive=false;
        if(wasPlayingBeforeDrag){ startUtterFromPercent(dragPct); }
        else {
          // Just set logical start so if user hits play it continues from here
          startTs = Date.now() - (speechDuration * dragPct * 1000);
          updateProgress();
          statusEl.textContent='Ready';
        }
      });
      // Click (no drag)
      progressWrap.addEventListener('click', (e)=>{ if(dragActive) return; if(speechDuration<=0) return; const pct = pctFromEvent(e, progressWrap); if(isPlaying && !isPaused) startUtterFromPercent(pct); else { previewSeek(pct); startTs = Date.now() - (speechDuration * pct * 1000); } });
      // Keyboard handle
      const handle = rootEl.querySelector('#tts-progress-handle');
      if(handle){
        handle.addEventListener('keydown', (e)=>{
          if(!speechDuration) return;
          let delta = 0;
          if(e.key==='ArrowRight') delta=0.02; else if(e.key==='ArrowLeft') delta=-0.02; else if(e.key==='Home'){ previewSeek(0); e.preventDefault(); return; } else if(e.key==='End'){ previewSeek(1); e.preventDefault(); return; }
          if(delta!==0){ e.preventDefault(); const curPct = (parseFloat(progressEl.style.width)||0)/100; const np = Math.max(0, Math.min(1, curPct+delta)); if(isPlaying && !isPaused) startUtterFromPercent(np); else previewSeek(np); }
        });
      }
    }

    // Auto update total time when speed or text changes
    if(speedEl) speedEl.addEventListener('input', ()=>{ if(textInput) speechDuration = calcDuration(textInput.value||''); if(totalEl) totalEl.textContent = formatTime(speechDuration); });
    if(textInput && totalEl) textInput.addEventListener('input', ()=>{ speechDuration = calcDuration(textInput.value||''); totalEl.textContent = formatTime(speechDuration); });

  // Accessibility: focus management for keyboard use
  const focusable = Array.from(rootEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
  focusable.forEach(el => el.setAttribute('tabindex', '0'));

    // Expose control on root element
  rootEl._tts = { play, pause, stop, replay, resume };
  }

  // Auto init if page contains #tts-section
  document.addEventListener('DOMContentLoaded', function(){
    const el = document.getElementById('tts-section');
    if(el) init(el);
  });

  // Public API
  window.initTTSSection = init;
})();
