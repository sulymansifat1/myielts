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
    const playBtn = $( '#tts-play', rootEl );
    const pauseBtn = $( '#tts-pause', rootEl );
    const stopBtn = $( '#tts-stop', rootEl );
    const replayBtn = $( '#tts-replay', rootEl );
    const statusEl = $( '#tts-status', rootEl );
    const progressEl = $( '#tts-progress', rootEl );
    const currentEl = $( '#tts-current', rootEl );
    const totalEl = $( '#tts-total', rootEl );
    const volumeEl = $( '#tts-volume', rootEl );
    const speedEl = $( '#tts-speed', rootEl );

    let isPlaying=false, isPaused=false, utter=null, speechDuration=0, startTs=0, intervalId=null;

    function updateWordCount(){
      if(!textInput) return;
      const words = textInput.value.trim().split(/\s+/).filter(Boolean);
      const count = words.length;
      wordCountEl.textContent = count;
      playBtn.disabled = !(count>0 && count<=5000) || isPlaying;
      if(count>5000){ statusEl.textContent = 'Maximum 5000 words allowed'; }
      else if(count===0){ statusEl.textContent = 'Enter text to convert to speech'; }
      else{ statusEl.textContent = 'Ready'; }
    }

    function calcDuration(text){
      const words = text.split(/\s+/).filter(Boolean).length;
      const wpm = 150 * (parseFloat(speedEl.value)||1);
      return (words / wpm) * 60; // seconds
    }

    function updateProgress(){
      if(!isPlaying || isPaused || speechDuration<=0) return;
      const now = (Date.now()-startTs)/1000;
      const pct = Math.min((now/speechDuration)*100,100);
      if(progressEl) progressEl.style.width = pct+'%';
      if(currentEl) currentEl.textContent = formatTime(now);
      if(totalEl) totalEl.textContent = formatTime(speechDuration);
    }

    function startProgress(){ intervalId = setInterval(updateProgress,200); }
    function stopProgress(){ if(intervalId) clearInterval(intervalId); intervalId=null; }

    function play(){
      if(!textInput) return;
      const text = textInput.value.trim();
      if(!text) return;
      if(window.speechSynthesis.speaking) window.speechSynthesis.cancel();

      speechDuration = calcDuration(text);
      utter = new SpeechSynthesisUtterance(addNaturalPauses(text));
      utter.rate = parseFloat(speedEl.value)||1;
      utter.volume = (parseFloat(volumeEl.value)||80)/100;
      utter.pitch = 1.05;

      utter.onstart = function(){ isPlaying=true; isPaused=false; startTs = Date.now(); statusEl.textContent='Speaking...'; startProgress(); playBtn.disabled=true; pauseBtn.disabled=false; stopBtn.disabled=false; replayBtn.disabled=true; };
      utter.onend = function(){ isPlaying=false; isPaused=false; stopProgress(); statusEl.textContent='Completed'; playBtn.disabled=false; pauseBtn.disabled=true; stopBtn.disabled=true; replayBtn.disabled=false; if(progressEl) progressEl.style.width='100%'; };
      utter.onerror = function(e){ console.error('TTS error', e); isPlaying=false; isPaused=false; stopProgress(); statusEl.textContent='Error during speech'; playBtn.disabled=false; pauseBtn.disabled=true; stopBtn.disabled=true; };

      window.speechSynthesis.speak(utter);
    }

    function pause(){ if(window.speechSynthesis.speaking && !window.speechSynthesis.paused){ window.speechSynthesis.pause(); isPaused=true; stopProgress(); statusEl.textContent='Paused'; pauseBtn.disabled=true; playBtn.disabled=false; }}
    function resume(){ if(window.speechSynthesis.paused){ window.speechSynthesis.resume(); isPaused=false; startProgress(); statusEl.textContent='Speaking...'; pauseBtn.disabled=false; playBtn.disabled=true; }}
    function stop(){ window.speechSynthesis.cancel(); isPlaying=false; isPaused=false; stopProgress(); if(progressEl) progressEl.style.width='0%'; if(currentEl) currentEl.textContent='0:00'; if(totalEl) totalEl.textContent='0:00'; statusEl.textContent='Stopped'; playBtn.disabled=false; pauseBtn.disabled=true; stopBtn.disabled=true; replayBtn.disabled=false; }
    function replay(){ stop(); setTimeout(()=>{ play(); },200); }

    // Events
    if(textInput){ textInput.addEventListener('input', updateWordCount); updateWordCount(); }
    if(playBtn) playBtn.addEventListener('click', ()=>{ if(window.speechSynthesis.paused) resume(); else play(); });
    if(pauseBtn) pauseBtn.addEventListener('click', ()=>{ if(window.speechSynthesis.paused) resume(); else pause(); });
    if(stopBtn) stopBtn.addEventListener('click', stop);
    if(replayBtn) replayBtn.addEventListener('click', replay);

    // allow clicking progress (basic seek by cancelling and restarting from an approximate position)
    const progressWrap = rootEl.querySelector('.tts-progress-bar');
    if(progressWrap){ progressWrap.addEventListener('click', function(e){ if(!isPlaying || speechDuration<=0) return; const rect = this.getBoundingClientRect(); const pct = (e.clientX-rect.left)/rect.width; const seek = Math.max(0, Math.min(1,pct)); const text = textInput.value.trim(); const words = text.split(/\s+/).filter(Boolean); const seekIndex = Math.floor(words.length * seek); const remaining = words.slice(seekIndex).join(' '); window.speechSynthesis.cancel(); utter = new SpeechSynthesisUtterance(addNaturalPauses(remaining)); utter.rate = parseFloat(speedEl.value)||1; utter.volume = (parseFloat(volumeEl.value)||80)/100; utter.onstart = function(){ isPlaying=true; startTs = Date.now() - (speechDuration * seek * 1000); startProgress(); statusEl.textContent='Speaking...'; };
          utter.onend = function(){ isPlaying=false; stopProgress(); statusEl.textContent='Completed'; };
          window.speechSynthesis.speak(utter);
    }); }

    // Auto update total time when speed or text changes
    if(speedEl) speedEl.addEventListener('input', ()=>{ if(textInput) speechDuration = calcDuration(textInput.value||''); if(totalEl) totalEl.textContent = formatTime(speechDuration); });
    if(textInput && totalEl) textInput.addEventListener('input', ()=>{ speechDuration = calcDuration(textInput.value||''); totalEl.textContent = formatTime(speechDuration); });

    // Expose control on root element
    rootEl._tts = { play, pause, stop, replay };
  }

  // Auto init if page contains #tts-section
  document.addEventListener('DOMContentLoaded', function(){
    const el = document.getElementById('tts-section');
    if(el) init(el);
  });

  // Public API
  window.initTTSSection = init;
})();
