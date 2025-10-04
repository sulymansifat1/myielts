// IELTS Practice Test JavaScript
class IELTSPractice {
    constructor() {
        this.currentSection = 'listening';
        this.timers = {
            listening: 30 * 60, // 30 minutes
            reading: 60 * 60,   // 60 minutes
            writing: 60 * 60    // 60 minutes
        };
        this.taskTimers = {
            task1: 20 * 60, // 20 minutes
            task2: 40 * 60  // 40 minutes
        };
        this.taskRunning = {
            task1: false,
            task2: false
        };
        this.sectionRunning = {
            listening: false,
            reading: false
        };
        this.currentTimer = null;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0; // Track total paused time
        this.testStarted = false; // Always keep false to prevent any warnings
        this.timerRunning = false; // Separate flag for timer functionality
        this.testMode = null; // 'full' or 'individual'
        this.answers = {};
        this.progress = {
            listening: 0,
            reading: 0,
            writing: 0
        };
        this.isDarkMode = false;
        
        this.init();
    }

    init() {
        // Clear any saved progress on page load to ensure fresh start
        localStorage.removeItem('ielts-practice-progress');
        
        // Clear all form inputs to remove any previous text
        this.clearAllInputs();
        
        this.setupEventListeners();
        this.setupPageUnloadWarning();
        this.initDarkMode();
        this.showModal();

        // Set dynamic year for footer
        const yEl = document.getElementById('currentYear');
        if(yEl){ yEl.textContent = new Date().getFullYear(); }

        this.initFloatingTimer();
    }

    initFloatingTimer(){
        const ft = document.getElementById('floating-timer');
        if(!ft) return;
        const labelEl = document.getElementById('floating-timer-label');
        const valueEl = document.getElementById('floating-timer-value');
        const headerObserver = new IntersectionObserver(entries => {
            if(ft.dataset.enabled !== 'true') return; // don't show before mode selected
            let anyNotIntersecting = entries.some(e=> !e.isIntersecting && e.target.classList.contains('section-header'));
            if(anyNotIntersecting){
                if(ft.classList.contains('hidden')){ ft.style.display='flex'; requestAnimationFrame(()=> ft.classList.remove('hidden')); }
            } else {
                ft.classList.add('hidden');
                // keep display none after transition
                setTimeout(()=>{ if(ft.classList.contains('hidden')) ft.style.display='none'; },400);
            }
        }, {root:null, threshold:0});
        // Observe each section header
        document.querySelectorAll('.section-header').forEach(h=> headerObserver.observe(h));

        // Periodically sync timer text
        setInterval(()=>{
            if(!valueEl) return;
            let activeSection = this.currentSection || 'listening';
            labelEl.textContent = activeSection.charAt(0).toUpperCase()+activeSection.slice(1);
            // Determine timer element
            let timerSpan = null;
            if(activeSection==='listening') timerSpan = document.getElementById('listening-timer');
            else if(activeSection==='reading') timerSpan = document.getElementById('reading-timer');
            else if(activeSection==='writing') {
                // Could combine tasks, just show task1 or task2 whichever running
                timerSpan = document.getElementById('task1-timer') || document.getElementById('task2-timer');
            }
            if(timerSpan) valueEl.textContent = timerSpan.textContent.trim();
        }, 1000);
    }

    clearAllInputs() {
        // Clear all input fields, textareas, and select elements
        document.querySelectorAll('input[type="text"], input[type="number"], textarea, select').forEach(input => {
            input.value = '';
        });
        
        // Clear all gap inputs specifically
        document.querySelectorAll('.gap-input').forEach(input => {
            input.value = '';
        });
        
        // Clear writing area textareas
        document.querySelectorAll('.writing-area textarea').forEach(textarea => {
            textarea.value = '';
        });
        
        // Reset answers object
        this.answers = {};
    }

    clearSectionInputs(section){
        let container = null;
        if(section==='listening') container = document.getElementById('listening');
        if(section==='reading') container = document.getElementById('reading');
        if(!container) return;
        const inputs = container.querySelectorAll('.gap-input, input[type="text"], textarea');
        inputs.forEach(inp=>{ inp.value=''; });
        // Remove tracked answers for that section if stored
        if(this.answers && this.answers[section]){
            delete this.answers[section];
        }
    }

    setupEventListeners() {
        // Modal buttons
        document.getElementById('fullTestBtn').addEventListener('click', () => {
            this.selectTestMode('full');
        });

        document.getElementById('individualBtn').addEventListener('click', () => {
            this.selectTestMode('individual');
        });

        // Modal option selection
        document.getElementById('fullTestMode').addEventListener('click', () => {
            this.selectModalOption('full');
        });

        document.getElementById('individualMode').addEventListener('click', () => {
            this.selectModalOption('individual');
        });

        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                if(section === 'tts') {
                    const voiceModal = document.getElementById('tts-voice-modal');
                    // Show only if user has not already chosen and TTS root exists
                    if(voiceModal && !voiceModal.dataset.voiceChosen){
                        voiceModal.classList.remove('hidden');
                        // Prevent accidental background interactions while modal open
                        voiceModal.focus();
                    }
                }
                this.switchSection(section);
            });
        });

        // Start test button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startTest();
        });

        // Timer controls
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetTimer();
        });

        document.getElementById('changeModeBtn').addEventListener('click', () => {
            this.showModeSelection();
        });

        document.getElementById('darkModeBtn').addEventListener('click', () => {
            this.toggleDarkMode();
        });


        // Fill-in-the-gaps inputs
        document.querySelectorAll('.gap-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.saveAnswer(e.target);
                // No longer mark test as started to prevent warnings
            });
        });

        // Writing textareas
        document.getElementById('task1-text').addEventListener('input', (e) => {
            this.updateWordCount('task1', e.target.value);
            this.saveAnswer(e.target);
            // No longer mark test as started to prevent warnings
        });

        document.getElementById('task2-text').addEventListener('input', (e) => {
            this.updateWordCount('task2', e.target.value);
            this.saveAnswer(e.target);
            // No longer mark test as started to prevent warnings
        });

        // Writing task controls
        document.getElementById('start-task1').addEventListener('click', () => {
            this.startWritingTask('task1');
        });

        document.getElementById('start-task2').addEventListener('click', () => {
            this.startWritingTask('task2');
        });

        document.getElementById('pause-task1').addEventListener('click', () => {
            this.pauseWritingTask('task1');
        });

        document.getElementById('reset-task1').addEventListener('click', () => {
            this.resetWritingTask('task1');
        });

        document.getElementById('pause-task2').addEventListener('click', () => {
            this.pauseWritingTask('task2');
        });

        document.getElementById('reset-task2').addEventListener('click', () => {
            this.resetWritingTask('task2');
        });

        // Time input changes
        document.getElementById('task1-time').addEventListener('change', (e) => {
            this.updateTaskTime('task1', parseInt(e.target.value));
        });

        document.getElementById('task2-time').addEventListener('change', (e) => {
            this.updateTaskTime('task2', parseInt(e.target.value));
        });

        // Section controls
        document.getElementById('start-listening').addEventListener('click', () => {
            this.startSection('listening');
        });

        document.getElementById('start-reading').addEventListener('click', () => {
            this.startSection('reading');
        });

        document.getElementById('pause-listening').addEventListener('click', () => {
            this.pauseSection('listening');
        });

        document.getElementById('reset-listening').addEventListener('click', () => {
            this.resetSection('listening');
        });

        document.getElementById('pause-reading').addEventListener('click', () => {
            this.pauseSection('reading');
        });

        document.getElementById('reset-reading').addEventListener('click', () => {
            this.resetSection('reading');
        });

        // Refresh buttons to clear answers
        const listeningRefresh = document.getElementById('listening-refresh');
        if(listeningRefresh){
            listeningRefresh.addEventListener('click', ()=>{
                this.clearSectionInputs('listening');
            });
        }
        const readingRefresh = document.getElementById('reading-refresh');
        if(readingRefresh){
            readingRefresh.addEventListener('click', ()=>{
                this.clearSectionInputs('reading');
            });
        }
        const ttsAnswersRefresh = document.getElementById('tts-answers-refresh');
        if(ttsAnswersRefresh){
            ttsAnswersRefresh.addEventListener('click', ()=>{
                document.querySelectorAll('.tts-answer').forEach(inp=> inp.value='');
            });
        }

        // Section time input changes
        document.getElementById('listening-time').addEventListener('change', (e) => {
            this.updateSectionTime('listening', parseInt(e.target.value));
        });

        document.getElementById('reading-time').addEventListener('change', (e) => {
            this.updateSectionTime('reading', parseInt(e.target.value));
        });

        // Control buttons
        document.getElementById('nextSectionBtn').addEventListener('click', () => {
            this.goToNextSection();
        });

        document.getElementById('finishTestBtn').addEventListener('click', () => {
            this.finishTest();
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveProgress();
        });


        // Custom alert modal event listeners
        document.getElementById('alertOk').addEventListener('click', () => {
            this.hideCustomAlert();
            if (this.alertCallback) {
                this.alertCallback(true);
                this.alertCallback = null;
            }
        });

        document.getElementById('alertCancel').addEventListener('click', () => {
            this.hideCustomAlert();
            if (this.alertCallback) {
                this.alertCallback(false);
                this.alertCallback = null;
            }
        });
    }











    setupPageUnloadWarning() {
        // Show browser's default warning when trying to leave/reload
        window.addEventListener('beforeunload', (e) => {
            // This will show the browser's default "Leave site?" warning
            e.preventDefault();
            e.returnValue = '';
            return '';
        });
    }

    hasAnyAnswers() {
        // Always return false to prevent any warnings
        return false;
    }

    hasOngoingTest() {
        // Check if there's any ongoing test activity
        return this.timerRunning || 
               Object.keys(this.answers).length > 0 || 
               this.currentSection !== null ||
               (this.timers && Object.values(this.timers).some(time => time > 0)) ||
               (this.taskTimers && Object.values(this.taskTimers).some(time => time > 0));
    }

    getFormattedTime() {
        if (!this.startTime) return '00:00:00';
        
        const elapsed = Math.floor((Date.now() - this.startTime - this.pausedTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    isListeningCompleted() {
        // Check if listening section has sufficient answers (50% completion)
        if (!this.answers.listening) return false;
        
        const listeningAnswers = this.answers.listening;
        const requiredQuestions = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];
        
        // Check if at least 50% of questions are answered (5 out of 10)
        const answeredCount = requiredQuestions.filter(q => 
            listeningAnswers[q] && listeningAnswers[q].trim() !== ''
        ).length;
        
        return answeredCount >= 5;
    }

    isReadingCompleted() {
        // Check if reading section has sufficient answers (50% completion)
        if (!this.answers.reading) return false;
        
        const readingAnswers = this.answers.reading;
        const requiredQuestions = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];
        
        // Check if at least 50% of questions are answered (5 out of 10)
        const answeredCount = requiredQuestions.filter(q => 
            readingAnswers[q] && readingAnswers[q].trim() !== ''
        ).length;
        
        return answeredCount >= 5;
    }

    isWritingCompleted() {
        // Check if writing section has sufficient content (50% completion)
        if (!this.answers.writing) return false;
        
        const writingAnswers = this.answers.writing;
        const task1Text = writingAnswers['task1-text'] || '';
        const task2Text = writingAnswers['task2-text'] || '';
        
        // Check if at least one task has substantial content (at least 25 words)
        const task1Words = task1Text.trim().split(/\s+/).length;
        const task2Words = task2Text.trim().split(/\s+/).length;
        
        return task1Words >= 25 || task2Words >= 25;
    }


    showModal() {
        document.getElementById('testModeModal').style.display = 'flex';
        document.getElementById('mainContainer').style.display = 'none';
        this.selectedMode = null;
        this.updateModalButtons();
    }

    showModeSelection() {
        // Check if there's an ongoing test
        if (this.hasOngoingTest()) {
            this.showCustomConfirm('⚠️', 'Leave Test?', 'You have an ongoing test. Are you sure you want to change mode? Your progress will be lost.', (confirmed) => {
                if (confirmed) {
                    // User confirmed, proceed with mode change
                    this.proceedWithModeChange();
                }
                // If not confirmed, do nothing (stay in current mode)
            });
            return;
        }
        
        // No ongoing test, proceed directly
        this.proceedWithModeChange();
    }

    proceedWithModeChange() {
        // Hide the main container and show the mode selection modal
        document.getElementById('mainContainer').style.display = 'none';
        document.getElementById('testModeModal').style.display = 'flex';
        
        // Hide the change mode button
        document.getElementById('changeModeBtn').style.display = 'none';
        
        // Reset any ongoing test state
        this.resetTestState();
    }

    initDarkMode() {
        // Check if user has manually set a preference in localStorage
        const savedTheme = localStorage.getItem('darkMode');
        console.log('Initializing dark mode...');
        console.log('Saved theme in localStorage:', savedTheme);
        
        if (savedTheme !== null) {
            // User has manually set a preference, use it
            console.log('Using saved theme preference:', savedTheme);
            if (savedTheme === 'true') {
                this.isDarkMode = true;
                document.documentElement.setAttribute('data-theme', 'dark');
                document.getElementById('darkModeBtn').textContent = '☀️';
            } else {
                this.isDarkMode = false;
                document.documentElement.removeAttribute('data-theme');
                document.getElementById('darkModeBtn').textContent = '🌙';
            }
        } else {
            // No manual preference, detect system theme
            console.log('No saved preference, detecting system theme...');
            this.detectSystemTheme();
        }
    }

    detectSystemTheme() {
        // Debug: Log system theme detection
        console.log('Detecting system theme...');
        console.log('window.matchMedia available:', !!window.matchMedia);
        
        // Try multiple methods to detect system theme
        let systemPrefersDark = false;
        
        // Method 1: Standard prefers-color-scheme
        if (window.matchMedia) {
            try {
                const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
                console.log('Dark mode query:', darkModeQuery);
                console.log('System prefers dark mode:', darkModeQuery.matches);
                systemPrefersDark = darkModeQuery.matches;
                
                // Listen for system theme changes
                darkModeQuery.addEventListener('change', (e) => {
                    console.log('System theme changed:', e.matches);
                    // Only auto-switch if user hasn't manually set a preference
                    const savedTheme = localStorage.getItem('darkMode');
                    if (savedTheme === null) {
                        if (e.matches) {
                            this.isDarkMode = true;
                            document.documentElement.setAttribute('data-theme', 'dark');
                            document.getElementById('darkModeBtn').textContent = '☀️';
                        } else {
                            this.isDarkMode = false;
                            document.documentElement.removeAttribute('data-theme');
                            document.getElementById('darkModeBtn').textContent = '🌙';
                        }
                    }
                });
            } catch (error) {
                console.log('Error with matchMedia:', error);
            }
        }
        
        // Method 2: Check if we're in a dark environment (fallback)
        if (!systemPrefersDark) {
            // Check if the system might be in dark mode through other indicators
            const isLikelyDark = (
                // Check if the user has a dark theme preference in their browser
                document.documentElement.style.colorScheme === 'dark' ||
                // Check if the system is likely in dark mode based on time (evening/night)
                (new Date().getHours() >= 18 || new Date().getHours() <= 6) ||
                // Check if the browser has any dark mode indicators
                navigator.userAgent.toLowerCase().includes('dark')
            );
            
            if (isLikelyDark) {
                console.log('Fallback detection suggests dark mode');
                systemPrefersDark = true;
            }
        }
        
        // Apply the detected theme
        if (systemPrefersDark) {
            console.log('Setting dark mode based on system preference');
            this.isDarkMode = true;
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('darkModeBtn').textContent = '☀️';
        } else {
            console.log('Setting light mode based on system preference');
            this.isDarkMode = false;
            document.documentElement.removeAttribute('data-theme');
            document.getElementById('darkModeBtn').textContent = '🌙';
        }
    }

    detectSystemThemeFallback() {
        // Alternative method to detect system theme
        console.log('Using fallback theme detection...');
        
        // Check if the browser has any dark mode indicators
        const isDarkMode = (
            // Check if the system is likely in dark mode
            window.screen && window.screen.colorDepth <= 16 ||
            // Check if the user agent suggests dark mode preference
            navigator.userAgent.includes('Dark') ||
            // Check if there are any dark mode CSS media queries that match
            document.documentElement.style.colorScheme === 'dark'
        );
        
        console.log('Fallback detection result:', isDarkMode);
        
        if (isDarkMode) {
            this.isDarkMode = true;
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('darkModeBtn').textContent = '☀️';
        } else {
            // Default to light mode if we can't detect
            this.isDarkMode = false;
            document.documentElement.removeAttribute('data-theme');
            document.getElementById('darkModeBtn').textContent = '🌙';
        }
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        
        if (this.isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('darkModeBtn').textContent = '☀️';
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.getElementById('darkModeBtn').textContent = '🌙';
            localStorage.setItem('darkMode', 'false');
        }
        
        // User has now manually set a preference, so stop following system theme
        // The system theme listener will check localStorage and won't override manual choice
    }

    showCustomAlert(icon, title, message, showCancel = false, callback = null) {
        document.getElementById('alertIcon').textContent = icon;
        document.getElementById('alertTitle').textContent = title;
        document.getElementById('alertMessage').textContent = message;
        document.getElementById('alertCancel').style.display = showCancel ? 'block' : 'none';
        
        this.alertCallback = callback;
        document.getElementById('customAlertModal').style.display = 'flex';
    }

    hideCustomAlert() {
        document.getElementById('customAlertModal').style.display = 'none';
    }

    showCustomConfirm(icon, title, message, callback) {
        this.showCustomAlert(icon, title, message, true, callback);
    }

    selectModalOption(mode) {
        this.selectedMode = mode;
        
        // Remove selected class from all options
        document.querySelectorAll('.mode-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Add selected class to chosen option
        document.getElementById(mode === 'full' ? 'fullTestMode' : 'individualMode').classList.add('selected');
        
        this.updateModalButtons();
    }

    updateModalButtons() {
        const fullBtn = document.getElementById('fullTestBtn');
        const individualBtn = document.getElementById('individualBtn');
        
        if (this.selectedMode === 'full') {
            fullBtn.style.opacity = '1';
            fullBtn.style.cursor = 'pointer';
            individualBtn.style.opacity = '0.5';
            individualBtn.style.cursor = 'not-allowed';
        } else if (this.selectedMode === 'individual') {
            individualBtn.style.opacity = '1';
            individualBtn.style.cursor = 'pointer';
            fullBtn.style.opacity = '0.5';
            fullBtn.style.cursor = 'not-allowed';
        } else {
            fullBtn.style.opacity = '0.5';
            fullBtn.style.cursor = 'not-allowed';
            individualBtn.style.opacity = '0.5';
            individualBtn.style.cursor = 'not-allowed';
        }
    }

    selectTestMode(mode) {
        if (!this.selectedMode) {
            this.showCustomAlert('⚠️', 'Selection Required', 'Please select a practice mode first by clicking on one of the options above.');
            return;
        }
        
        this.testMode = mode;
        document.getElementById('testModeModal').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
    // Allow floating timer usage after modal hidden
    const ft = document.getElementById('floating-timer');
    if(ft){ ft.dataset.enabled = 'true'; }
        
        // Show the change mode button
        document.getElementById('changeModeBtn').style.display = 'inline-block';
        
        if (mode === 'full') {
            this.setupFullTestMode();
        } else {
            this.setupIndividualMode();
        }
        
        // Reset to beginning - no saved progress loading
        this.currentSection = 'listening';
        this.switchSection('listening');
        
        // Ensure all inputs are enabled after loading
        setTimeout(() => {
            this.enableQuestionAccess();
        }, 100);
    }

    setupFullTestMode() {
        // Show main timer and progress controls
        document.getElementById('mainTimerDisplay').style.display = 'flex';
        document.querySelector('footer').style.display = 'block';
        // Hide TTS tab in full test
        const ttsTab = document.querySelector('.nav-btn[data-section="tts"]');
        if(ttsTab){ ttsTab.style.display='none'; }
    // Hide refresh buttons in full mode
    const refreshBtns = document.querySelectorAll('.section-refresh-btn, #tts-answers-refresh');
    refreshBtns.forEach(b=> b.style.display='none');
    // Show footer action buttons
    document.querySelectorAll('.full-only').forEach(el=>{ el.style.display=''; });
        
        // Hide individual section controls
        document.querySelectorAll('.section-controls').forEach(control => {
            control.style.display = 'none';
        });
        
        // Hide individual task controls
        document.querySelectorAll('.task-controls').forEach(control => {
            control.style.display = 'none';
        });
        
        // Show appropriate buttons for full test mode
        this.updateFooterButtons();
        
        // Allow immediate access to questions - don't require "Start Test" first
        this.enableQuestionAccess();
    }

    setupIndividualMode() {
        // Hide main timer and progress controls
        document.getElementById('mainTimerDisplay').style.display = 'none';
        document.querySelector('footer').style.display = 'none';
        // Show TTS tab in individual mode
        const ttsTab = document.querySelector('.nav-btn[data-section="tts"]');
        if(ttsTab){ ttsTab.style.display='inline-block'; }
    // Show refresh buttons only in individual mode
    const refreshBtns = document.querySelectorAll('.section-refresh-btn');
    refreshBtns.forEach(b=> b.style.display='inline-flex');
    const ttsRefresh = document.getElementById('tts-answers-refresh');
    if(ttsRefresh) ttsRefresh.style.display='inline-flex';
    // Hide footer action buttons in individual mode
    document.querySelectorAll('.full-only').forEach(el=>{ el.style.display='none'; });
        
        // Show individual section controls
        document.querySelectorAll('.section-controls').forEach(control => {
            control.style.display = 'flex';
        });
        
        // Show individual task controls
        document.querySelectorAll('.task-controls').forEach(control => {
            control.style.display = 'flex';
        });
        
        // Enable question access for individual mode too
        this.enableQuestionAccess();
    }

    switchSection(section, bypassRestrictions = false) {
        // Check section completion requirements in mock test (only for navigation buttons)
        if (this.testMode === 'full' && !bypassRestrictions) {
            if (section === 'reading' && !this.isListeningCompleted()) {
                return; // Don't switch to reading without completing listening
            }
            if (section === 'writing' && (!this.isListeningCompleted() || !this.isReadingCompleted())) {
                return; // Don't switch to writing without completing listening and reading
            }
        }

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(section).classList.add('active');

        // Update timer
        this.currentSection = section;
        if (this.timerRunning) {
            this.startSectionTimer(section);
        }
        
        // Update footer buttons
        if (this.testMode === 'full') {
            this.updateFooterButtons();
        }
        
        // Update navigation button states
        this.updateNavigationStates();
    }

    updateNavigationStates() {
        if (this.testMode === 'full') {
            const listeningCompleted = this.isListeningCompleted();
            const readingCompleted = this.isReadingCompleted();
            
            // Update Reading button
            const readingBtn = document.querySelector('[data-section="reading"]');
            if (readingBtn) {
                if (listeningCompleted) {
                    readingBtn.disabled = false;
                    readingBtn.style.opacity = '1';
                    readingBtn.style.cursor = 'pointer';
                    readingBtn.title = 'Reading Section';
                } else {
                    readingBtn.disabled = true;
                    readingBtn.style.opacity = '0.5';
                    readingBtn.style.cursor = 'not-allowed';
                    readingBtn.title = 'Complete at least 5 Listening questions first';
                }
            }
            
            // Update Writing button
            const writingBtn = document.querySelector('[data-section="writing"]');
            if (writingBtn) {
                if (listeningCompleted && readingCompleted) {
                    writingBtn.disabled = false;
                    writingBtn.style.opacity = '1';
                    writingBtn.style.cursor = 'pointer';
                    writingBtn.title = 'Writing Section';
                } else {
                    writingBtn.disabled = true;
                    writingBtn.style.opacity = '0.5';
                    writingBtn.style.cursor = 'not-allowed';
                    if (!listeningCompleted) {
                        writingBtn.title = 'Complete at least 5 Listening questions first';
                    } else if (!readingCompleted) {
                        writingBtn.title = 'Complete at least 5 Reading questions first';
                    }
                }
            }
        }
    }

    updateFooterButtons() {
        const sections = ['listening', 'reading', 'writing', 'tts'];
        const currentIndex = sections.indexOf(this.currentSection);
        
        // Hide finish button first
        document.getElementById('finishTestBtn').style.display = 'none';
        
        if (currentIndex < sections.length - 1) {
            const nextSection = sections[currentIndex + 1];
            let canAccessNext = true;
            let hasAnyProgress = false;
            
            // Check if current section has any progress
            if (this.answers[this.currentSection]) {
                const currentAnswers = this.answers[this.currentSection];
                hasAnyProgress = Object.values(currentAnswers).some(answer => 
                    answer && answer.trim() !== ''
                );
            }
            
            // Debug: Log progress check
            console.log('Progress check:', {
                currentSection: this.currentSection,
                answers: this.answers[this.currentSection],
                hasAnyProgress: hasAnyProgress
            });
            
            // Check if next section is accessible in mock test
            if (this.testMode === 'full') {
                // For navigation buttons, we still check 50% completion
                // But for "Go to Next Section" button, we only need any progress
                // So we don't restrict canAccessNext here for the footer button
            }
            
            // Always show "Go to Next Section" button
            document.getElementById('nextSectionBtn').style.display = 'inline-block';
            document.getElementById('nextSectionBtn').textContent = `Go to ${nextSection.charAt(0).toUpperCase() + nextSection.slice(1)}`;
            
            // Enable/disable button based on progress and accessibility
            if (hasAnyProgress && canAccessNext) {
                document.getElementById('nextSectionBtn').disabled = false;
                document.getElementById('nextSectionBtn').style.opacity = '1';
                document.getElementById('nextSectionBtn').style.cursor = 'pointer';
                document.getElementById('nextSectionBtn').title = `Go to ${nextSection.charAt(0).toUpperCase() + nextSection.slice(1)} section`;
        } else {
                document.getElementById('nextSectionBtn').disabled = true;
                document.getElementById('nextSectionBtn').style.opacity = '0.5';
                document.getElementById('nextSectionBtn').style.cursor = 'not-allowed';
                if (!hasAnyProgress) {
                    document.getElementById('nextSectionBtn').title = 'Fill in at least one gap to proceed';
                } else if (!canAccessNext) {
                    document.getElementById('nextSectionBtn').title = 'Complete current section requirements first';
                }
            }
        } else {
            // Hide next button and show finish button on last section
            document.getElementById('nextSectionBtn').style.display = 'none';
            document.getElementById('finishTestBtn').style.display = 'inline-block';
        }
        
        // Debug: Log button states
        console.log('Footer buttons updated:', {
            currentSection: this.currentSection,
            testMode: this.testMode,
            hasAnyProgress: hasAnyProgress,
            listeningCompleted: this.isListeningCompleted(),
            readingCompleted: this.isReadingCompleted(),
            nextBtnDisplay: document.getElementById('nextSectionBtn').style.display,
            nextBtnDisabled: document.getElementById('nextSectionBtn').disabled,
            finishBtnDisplay: document.getElementById('finishTestBtn').style.display
        });
    }

    goToNextSection() {
        // Check if button is disabled
        const nextBtn = document.getElementById('nextSectionBtn');
        if (nextBtn.disabled) {
            return; // Don't proceed if button is disabled
        }
        
    const sections = ['listening', 'reading', 'writing', 'tts'];
        const currentIndex = sections.indexOf(this.currentSection);
        
        if (currentIndex < sections.length - 1) {
            const nextSection = sections[currentIndex + 1];
            
            // For "Go to Next Section" button, we allow navigation with any progress
            // The navigation buttons still have the 50% completion restrictions
            
            // Auto-save current progress
            this.saveProgress();
            
            // Move to next section (bypass restrictions for footer button)
            this.switchSection(nextSection, true);
        }
    }

    finishTest() {
        this.showCustomConfirm('🏁', 'Finish Test', 'Are you sure you want to finish the test? You will be able to download your answers as PDF.', (confirmed) => {
            if (confirmed) {
                // Auto-save final progress
                this.saveProgress();
                
                // Clear the test state to remove warnings
                this.testStarted = false; // Always keep false to prevent any warnings
                this.answers = {};
                
                // Show results with PDF download
                this.showTestResults();
                
                // Stop all timers
                if (this.currentTimer) {
                    clearInterval(this.currentTimer);
                }
                if (this.sectionTimers) {
                    Object.values(this.sectionTimers).forEach(timer => clearInterval(timer));
                }
            }
        });
    }

    enableQuestionAccess() {
        // Enable all input fields and textareas
        document.querySelectorAll('.gap-input, textarea').forEach(input => {
            input.disabled = false;
            input.style.opacity = '1';
            input.style.pointerEvents = 'auto';
            input.removeAttribute('readonly');
        });
        
        // Enable navigation between sections
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        });
        
        // Update navigation states for mock test restrictions
        this.updateNavigationStates();
        
        // Make sure all sections are accessible
        document.querySelectorAll('.section').forEach(section => {
            section.style.pointerEvents = 'auto';
        });
        
        // Enable all form elements
        document.querySelectorAll('input, textarea, button').forEach(element => {
            if (!element.id || !element.id.includes('start') && !element.id.includes('pause')) {
                element.disabled = false;
                element.style.pointerEvents = 'auto';
            }
        });
    }

    startTest() {
        if (!this.timerRunning) {
            this.timerRunning = true;
            this.startTime = Date.now();
            this.pausedTime = 0; // Reset paused time when starting fresh
            
            // Show/hide buttons
            document.getElementById('startBtn').style.display = 'none';
            document.getElementById('pauseBtn').style.display = 'inline-block';
            document.getElementById('resetBtn').style.display = 'inline-block';
            
            // Start timers
            this.startMainTimer();
            this.startSectionTimer(this.currentSection);
        }
    }

    startMainTimer() {
        this.currentTimer = setInterval(() => {
            if (!this.isPaused && this.timerRunning) {
                const elapsed = Math.floor((Date.now() - this.startTime - this.pausedTime) / 1000);
                this.updateMainTimer(elapsed);
            }
        }, 1000);
    }

    startSectionTimer(section) {
        const timerElement = document.getElementById(`${section}-timer`);
        if (!timerElement) return;

        const updateSectionTimer = () => {
            if (this.sectionRunning[section] || (this.timerRunning && this.currentSection === section)) {
                this.timers[section]--;
                
                if (this.timers[section] <= 0) {
                    this.timers[section] = 0;
                    this.handleTimeUp(section);
                }
                
                timerElement.textContent = this.formatTime(this.timers[section]);
            }
        };

        // Clear existing timer for this section
        if (this.sectionTimers && this.sectionTimers[section]) {
            clearInterval(this.sectionTimers[section]);
        }

        // Start new timer
        if (!this.sectionTimers) this.sectionTimers = {};
        this.sectionTimers[section] = setInterval(updateSectionTimer, 1000);
    }

    updateMainTimer(elapsed) {
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        document.getElementById('timer').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatTime(seconds) {
        // Handle undefined, null, or NaN values
        if (seconds === undefined || seconds === null || isNaN(seconds)) {
            return '00:00';
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    togglePause() {
        if (!this.isPaused) {
            // Pausing - record the pause start time
            this.pauseStartTime = Date.now();
        } else {
            // Resuming - add the paused duration to total paused time
            if (this.pauseStartTime) {
                this.pausedTime += Date.now() - this.pauseStartTime;
            }
        }
        
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        pauseBtn.style.backgroundColor = this.isPaused ? '#28a745' : '#ffc107';
    }

    resetTimer() {
        this.showCustomConfirm('🔄', 'Reset Timer', 'Are you sure you want to reset the timer? This will restart all section timers.', (confirmed) => {
            if (confirmed) {
                // Stop all timers
                if (this.currentTimer) {
                    clearInterval(this.currentTimer);
                    this.currentTimer = null;
                }
                if (this.sectionTimers) {
                    Object.values(this.sectionTimers).forEach(timer => clearInterval(timer));
                    this.sectionTimers = {};
                }
                
                // Reset timer values
                this.timers = {
                    listening: 30 * 60,
                    reading: 60 * 60,
                    writing: 60 * 60
                };
                this.isPaused = false;
                this.timerRunning = false;
                this.pausedTime = 0; // Reset paused time
                
                // Reset UI to initial state
                document.getElementById('startBtn').style.display = 'inline-block';
                document.getElementById('pauseBtn').style.display = 'none';
                document.getElementById('resetBtn').style.display = 'none';
                
                // Reset timer display
                document.getElementById('timer').textContent = '00:00:00';
                
                // Reset section timers display
                document.querySelectorAll('[id$="-timer"]').forEach(timer => {
                    if (timer.id !== 'timer') {
                        const section = timer.id.replace('-timer', '');
                        // Ensure timers object exists and has the section
                        if (this.timers && this.timers[section] !== undefined) {
                            timer.textContent = this.formatTime(this.timers[section]);
                        } else {
                            timer.textContent = '00:00';
                        }
                    }
                });
            }
        });
    }

    handleTimeUp(section) {
        this.showCustomAlert('⏰', 'Time\'s Up!', `Time's up for ${section.charAt(0).toUpperCase() + section.slice(1)} section!`);
        
        // Auto-save when time is up
        this.saveProgress();
        
        // Move to next section if not the last one
        const sections = ['listening', 'reading', 'writing'];
        const currentIndex = sections.indexOf(section);
        if (currentIndex < sections.length - 1) {
            this.switchSection(sections[currentIndex + 1]);
        }
    }

    saveAnswer(input) {
        const section = this.getSectionFromInput(input);
        if (!this.answers[section]) {
            this.answers[section] = {};
        }
        
        const questionId = input.id || input.dataset.questionId || input.name || 'unknown';
        this.answers[section][questionId] = input.value;
        
        // Update navigation states when answers are saved (for mock test restrictions)
        if (this.testMode === 'full') {
            this.updateNavigationStates();
        }
        
        // Always update footer buttons when answers change
        this.updateFooterButtons();
    }

    getSectionFromInput(input) {
        let element = input;
        while (element && !element.classList.contains('section')) {
            element = element.closest('.section');
        }
        return element ? element.id : this.currentSection;
    }

    updateWordCount(taskId, text) {
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const count = text.trim() === '' ? 0 : words.length;
        document.getElementById(`${taskId}-count`).textContent = count;
    }

    updateTaskTime(taskId, minutes) {
        this.taskTimers[taskId] = minutes * 60;
        document.getElementById(`${taskId}-timer`).textContent = this.formatTime(this.taskTimers[taskId]);
        document.getElementById(`${taskId}-suggested-time`).textContent = minutes;
    }

    startWritingTask(taskId) {
        if (!this.taskRunning[taskId]) {
            this.taskRunning[taskId] = true;
            
            // Update UI
            document.getElementById(`start-${taskId}`).style.display = 'none';
            document.getElementById(`pause-${taskId}`).style.display = 'inline-block';
            document.getElementById(`reset-${taskId}`).style.display = 'inline-block';
            document.getElementById(`${taskId}-time`).disabled = true;
            
            // Start timer
            this.startTaskTimer(taskId);
        }
    }

    pauseWritingTask(taskId) {
        if (this.taskRunning[taskId]) {
            this.taskRunning[taskId] = false;
            
            // Update UI
            document.getElementById(`start-${taskId}`).style.display = 'inline-block';
            document.getElementById(`pause-${taskId}`).style.display = 'none';
            document.getElementById(`${taskId}-time`).disabled = false;
            
            // Stop timer
            if (this.taskTimerIntervals && this.taskTimerIntervals[taskId]) {
                clearInterval(this.taskTimerIntervals[taskId]);
            }
        }
    }

    resetWritingTask(taskId) {
        // Stop the timer
        if (this.taskTimerIntervals && this.taskTimerIntervals[taskId]) {
            clearInterval(this.taskTimerIntervals[taskId]);
            delete this.taskTimerIntervals[taskId];
        }
        
        // Reset task state
        this.taskRunning[taskId] = false;
        
        // Reset timer to original value
        const timeInput = document.getElementById(`${taskId}-time`);
        const originalTime = parseInt(timeInput.value) * 60;
        
        // Ensure taskTimers object exists and initialize if needed
        if (!this.taskTimers) {
            this.taskTimers = {};
        }
        this.taskTimers[taskId] = originalTime;
        
        // Update UI
        document.getElementById(`start-${taskId}`).style.display = 'inline-block';
        document.getElementById(`pause-${taskId}`).style.display = 'none';
        document.getElementById(`reset-${taskId}`).style.display = 'none';
        document.getElementById(`${taskId}-time`).disabled = false;
        
        // Update timer display
        document.getElementById(`${taskId}-timer`).textContent = this.formatTime(originalTime);
    }

    startTaskTimer(taskId) {
        const timerElement = document.getElementById(`${taskId}-timer`);
        if (!timerElement) return;

        const updateTaskTimer = () => {
            if (this.taskRunning[taskId]) {
                this.taskTimers[taskId]--;
                
                if (this.taskTimers[taskId] <= 0) {
                    this.taskTimers[taskId] = 0;
                    this.handleTaskTimeUp(taskId);
                }
                
                timerElement.textContent = this.formatTime(this.taskTimers[taskId]);
            }
        };

        // Clear existing timer for this task
        if (this.taskTimerIntervals && this.taskTimerIntervals[taskId]) {
            clearInterval(this.taskTimerIntervals[taskId]);
        }

        // Start new timer
        if (!this.taskTimerIntervals) this.taskTimerIntervals = {};
        this.taskTimerIntervals[taskId] = setInterval(updateTaskTimer, 1000);
    }

    handleTaskTimeUp(taskId) {
        this.showCustomAlert('⏰', 'Time\'s Up!', `Time's up for ${taskId.charAt(0).toUpperCase() + taskId.slice(1)}!`);
        
        // Stop the task
        this.taskRunning[taskId] = false;
        document.getElementById(`start-${taskId}`).style.display = 'inline-block';
        document.getElementById(`pause-${taskId}`).style.display = 'none';
        document.getElementById(`${taskId}-time`).disabled = false;
        
        // Clear timer
        if (this.taskTimerIntervals && this.taskTimerIntervals[taskId]) {
            clearInterval(this.taskTimerIntervals[taskId]);
        }
        
        // Auto-save
        this.saveProgress();
    }

    updateSectionTime(section, minutes) {
        this.timers[section] = minutes * 60;
        document.getElementById(`${section}-timer`).textContent = this.formatTime(this.timers[section]);
    }

    startSection(section) {
        if (!this.sectionRunning[section]) {
            this.sectionRunning[section] = true;
            
            // Update UI
            document.getElementById(`start-${section}`).style.display = 'none';
            document.getElementById(`pause-${section}`).style.display = 'inline-block';
            document.getElementById(`reset-${section}`).style.display = 'inline-block';
            document.getElementById(`${section}-time`).disabled = true;
            
            // Start timer
            this.startSectionTimer(section);
        }
    }

    pauseSection(section) {
        if (this.sectionRunning[section]) {
            this.sectionRunning[section] = false;
            
            // Update UI
            document.getElementById(`start-${section}`).style.display = 'inline-block';
            document.getElementById(`pause-${section}`).style.display = 'none';
            document.getElementById(`${section}-time`).disabled = false;
            
            // Stop timer
            if (this.sectionTimers && this.sectionTimers[section]) {
                clearInterval(this.sectionTimers[section]);
            }
        }
    }

    resetSection(section) {
        // Stop the timer
        if (this.sectionTimers && this.sectionTimers[section]) {
            clearInterval(this.sectionTimers[section]);
            delete this.sectionTimers[section];
        }
        
        // Reset section state
        this.sectionRunning[section] = false;
        
        // Reset timer to original value
        const timeInput = document.getElementById(`${section}-time`);
        const originalTime = parseInt(timeInput.value) * 60;
        
        // Ensure timers object exists and initialize if needed
        if (!this.timers) {
            this.timers = {};
        }
        this.timers[section] = originalTime;
        
        // Update UI
        document.getElementById(`start-${section}`).style.display = 'inline-block';
        document.getElementById(`pause-${section}`).style.display = 'none';
        document.getElementById(`reset-${section}`).style.display = 'none';
        document.getElementById(`${section}-time`).disabled = false;
        
        // Update timer display
        document.getElementById(`${section}-timer`).textContent = this.formatTime(originalTime);
    }


    saveProgress() {
        const progressData = {
            answers: this.answers,
            timers: this.timers,
            currentSection: this.currentSection,
            startTime: this.startTime,
            timestamp: Date.now()
        };

        localStorage.setItem('ielts-practice-progress', JSON.stringify(progressData));
        
        // Show save confirmation
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.backgroundColor = '#28a745';
        }, 2000);
    }

    loadSavedProgress() {
        const savedData = localStorage.getItem('ielts-practice-progress');
        if (savedData) {
            try {
                const progressData = JSON.parse(savedData);
                
                // Restore answers
                if (progressData.answers) {
                    this.answers = progressData.answers;
                    
                    // Populate form fields
                    Object.keys(this.answers).forEach(section => {
                        const sectionAnswers = this.answers[section];
                        Object.keys(sectionAnswers).forEach(questionId => {
                            const input = document.getElementById(questionId) || 
                                        document.querySelector(`[data-question-id="${questionId}"]`) ||
                                        document.querySelector(`[name="${questionId}"]`);
                            if (input) {
                                input.value = sectionAnswers[questionId];
                            }
                        });
                    });
                }
                
                // Restore timers and section automatically
                    if (progressData.timers) {
                        this.timers = progressData.timers;
                    }
                    if (progressData.currentSection) {
                        this.switchSection(progressData.currentSection);
                    }
                
            } catch (error) {
                console.error('Error loading saved progress:', error);
            }
        }
    }

    submitTest() {
        this.showCustomConfirm('📝', 'Submit Test', 'Are you sure you want to submit your test? This action cannot be undone.', (confirmed) => {
            if (confirmed) {
                // Calculate final scores (basic implementation)
                const results = this.calculateResults();
                
                // Show results
                this.showResults(results);
                
                // Clear saved progress
                localStorage.removeItem('ielts-practice-progress');
                
                // Stop all timers
                if (this.currentTimer) {
                    clearInterval(this.currentTimer);
                }
                if (this.sectionTimers) {
                    Object.values(this.sectionTimers).forEach(timer => clearInterval(timer));
                }
            }
        });
    }

    calculateResults() {
        const results = {
            listening: { answered: 0, total: 0, score: 0 },
            reading: { answered: 0, total: 0, score: 0 },
            writing: { answered: 0, total: 0, score: 0 }
        };

        // Count answers for each section
        Object.keys(results).forEach(section => {
            const inputs = document.querySelectorAll(`#${section} .gap-input, #${section} textarea`);
            results[section].total = inputs.length;
            
            inputs.forEach(input => {
                const questionId = input.id || input.dataset.questionId || input.name || 'unknown';
                if (this.answers[section] && this.answers[section][questionId] && 
                    this.answers[section][questionId].trim() !== '') {
                    results[section].answered++;
                }
            });
            
            results[section].score = results[section].total > 0 ? 
                Math.round((results[section].answered / results[section].total) * 100) : 0;
        });

        return results;
    }

    showTestResults() {
        const results = this.calculateResults();
        const resultsHtml = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background-color: rgba(0,0,0,0.8); z-index: 1000; 
                        display: flex; justify-content: center; align-items: center;">
                <div style="background: white; padding: 40px; border-radius: 15px; 
                           max-width: 700px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <h2 style="color: #2c3e50; margin-bottom: 30px; font-size: 2rem;">🎉 Test Completed!</h2>
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 2px solid #dee2e6;">
                        <h3 style="color: #495057; margin: 0 0 10px 0; font-size: 1.2rem;">⏱️ Time Taken</h3>
                        <p style="font-size: 1.5rem; font-weight: bold; color: #007bff; margin: 0; font-family: 'Courier New', monospace;">${this.getFormattedTime()}</p>
                    </div>
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="window.ieltsApp.downloadPDF()" 
                                style="padding: 12px 25px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; 
                                       border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600;
                                       box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); transition: all 0.3s ease;">
                            📄 Download .txt
                        </button>
                        <button onclick="window.ieltsApp.closeTestResults()" 
                                style="padding: 12px 25px; background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; 
                                       border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600;
                                       box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3); transition: all 0.3s ease;">
                            🔄 Start New Test
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', resultsHtml);
    }

    closeTestResults() {
        // Remove the modal
        const modal = document.querySelector('[style*="position: fixed"]');
        if (modal) {
            modal.remove();
        }
        
        // Reset the timer and test state
        this.resetTestState();
    }

    resetTestState() {
        // Stop all timers
        if (this.currentTimer) {
            clearInterval(this.currentTimer);
            this.currentTimer = null;
        }
        if (this.sectionTimers) {
            Object.values(this.sectionTimers).forEach(timer => clearInterval(timer));
            this.sectionTimers = {};
        }
        
        // Reset timer values
        this.timers = {
            listening: 30 * 60,
            reading: 60 * 60,
            writing: 60 * 60
        };
        this.isPaused = false;
        this.timerRunning = false;
        this.pausedTime = 0;
        this.startTime = null;
        
        // Reset answers
        this.answers = {};
        
        // Clear all form inputs
        this.clearAllInputs();
        
        // Reset UI to initial state
        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('resetBtn').style.display = 'none';
        
        // Reset timer display
        document.getElementById('timer').textContent = '00:00:00';
        
        // Reset section timers display
        document.querySelectorAll('[id$="-timer"]').forEach(timer => {
            if (timer.id !== 'timer') {
                const section = timer.id.replace('-timer', '');
                // Ensure timers object exists and has the section
                if (this.timers && this.timers[section] !== undefined) {
                    timer.textContent = this.formatTime(this.timers[section]);
                } else {
                    timer.textContent = '00:00';
                }
            }
        });
        
        // Go back to listening section
        this.currentSection = 'listening';
        this.switchSection('listening');
        
        // Update navigation states
        this.updateNavigationStates();
        this.updateFooterButtons();
        
        // Hide the change mode button
        document.getElementById('changeModeBtn').style.display = 'none';
        
        // Show the mode selection modal again
        this.showModal();
    }

    downloadPDF() {
        // Create PDF content with all answers
        const pdfContent = this.generatePDFContent();
        
        // Create and download txt file
        const element = document.createElement('a');
        const file = new Blob([pdfContent], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = 'IELTS_Practice_Test_Answers.txt';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        
        this.showCustomAlert('📄', 'File Downloaded', 'Your answers have been downloaded as a .txt file.');
    }

    generateHTMLContent() {
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>IELTS Practice Test - Answers</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 30px; page-break-inside: avoid; }
                .section-title { background: #007bff; color: white; padding: 10px; margin-bottom: 15px; }
                .question { margin-bottom: 10px; padding: 5px; }
                .answer { font-weight: bold; color: #333; }
                .writing-task { margin-bottom: 20px; }
                .writing-content { border: 1px solid #ddd; padding: 15px; margin-top: 10px; white-space: pre-wrap; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>IELTS PRACTICE TEST - ANSWERS</h1>
                <p>Test Date: ${new Date().toLocaleDateString()}</p>
                <p>Test Time: ${new Date().toLocaleTimeString()}</p>
            </div>
        `;

        // Listening Section
        html += `
            <div class="section">
                <div class="section-title">LISTENING SECTION</div>
        `;
        for (let i = 1; i <= 40; i++) {
            const input = document.querySelector(`#listening input[data-question-id="${i}"]`) || 
                         document.querySelector(`#listening .gap-input:nth-of-type(${i})`);
            const answer = input ? input.value : '';
            html += `<div class="question">${i}. <span class="answer">${answer}</span></div>`;
        }
        html += `</div>`;

        // Reading Section
        html += `
            <div class="section">
                <div class="section-title">READING SECTION</div>
        `;
        for (let i = 1; i <= 40; i++) {
            const input = document.querySelector(`#reading input[data-question-id="${i}"]`) || 
                         document.querySelector(`#reading .gap-input:nth-of-type(${i})`);
            const answer = input ? input.value : '';
            html += `<div class="question">${i}. <span class="answer">${answer}</span></div>`;
        }
        html += `</div>`;

        // Writing Section
        html += `
            <div class="section">
                <div class="section-title">WRITING SECTION</div>
                <div class="writing-task">
                    <h3>Task 1</h3>
                    <div class="writing-content">${document.getElementById('task1-text').value}</div>
                </div>
                <div class="writing-task">
                    <h3>Task 2</h3>
                    <div class="writing-content">${document.getElementById('task2-text').value}</div>
                </div>
            </div>
        `;

        html += `
            <div style="text-align: center; margin-top: 40px; color: #666;">
                <p>End of Test</p>
            </div>
        </body>
        </html>
        `;

        return html;
    }

    createPDF(htmlContent) {
        // Create a new window with the HTML content
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load, then trigger print
        printWindow.onload = function() {
            printWindow.focus();
            printWindow.print();
            
            // Close the window after printing
            setTimeout(() => {
                printWindow.close();
            }, 1000);
        };
    }

    generatePDFContent() {
        let content = 'IELTS PRACTICE TEST - ANSWERS\n';
        content += '=====================================\n\n';
        content += `Test Date: ${new Date().toLocaleDateString()}\n`;
        content += `Test Time: ${new Date().toLocaleTimeString()}\n\n`;
        
        // Listening Section
        content += 'LISTENING SECTION\n';
        content += '==================\n';
        for (let i = 1; i <= 40; i++) {
            const input = document.querySelector(`#listening input[data-question-id="${i}"]`) || 
                         document.querySelector(`#listening .gap-input:nth-of-type(${i})`);
            const answer = input ? input.value : '';
            content += `${i}. ${answer}\n`;
        }
        content += '\n';
        
        // Reading Section
        content += 'READING SECTION\n';
        content += '================\n';
        for (let i = 1; i <= 40; i++) {
            const input = document.querySelector(`#reading input[data-question-id="${i}"]`) || 
                         document.querySelector(`#reading .gap-input:nth-of-type(${i})`);
            const answer = input ? input.value : '';
            content += `${i}. ${answer}\n`;
        }
        content += '\n';
        
        // Writing Section
        content += 'WRITING SECTION\n';
        content += '================\n';
        content += 'Task 1:\n';
        const task1Text = document.getElementById('task1-text').value;
        content += task1Text + '\n\n';
        
        content += 'Task 2:\n';
        const task2Text = document.getElementById('task2-text').value;
        content += task2Text + '\n\n';
        
        content += 'End of Test\n';
        content += '===========\n';
        
        return content;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.ieltsApp = new IELTSPractice();
});

// Additional utility functions
function validateAnswers() {
    const inputs = document.querySelectorAll('.gap-input');
    inputs.forEach(input => {
        const correctAnswer = input.dataset.answer;
        const userAnswer = input.value.trim().toLowerCase();
        
        if (userAnswer === correctAnswer.toLowerCase()) {
            input.classList.remove('incorrect');
            input.classList.add('correct');
        } else if (userAnswer !== '') {
            input.classList.remove('correct');
            input.classList.add('incorrect');
        } else {
            input.classList.remove('correct', 'incorrect');
        }
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl + S to save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        document.getElementById('saveBtn').click();
    }
    
    // Ctrl + Enter to submit
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('submitBtn').click();
    }
    
    // Tab navigation between sections
    if (e.altKey && e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const sections = ['listening', 'reading', 'writing'];
        const sectionIndex = parseInt(e.key) - 1;
        if (sections[sectionIndex]) {
            document.querySelector(`[data-section="${sections[sectionIndex]}"]`).click();
        }
    }
});
