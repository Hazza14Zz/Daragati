// ============================================================
// SUPABASE CLOUD SYNC (Connected)
// ============================================================
const SUPABASE_URL = "https://dklyyzbnapkxlluximzk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrbHl5emJuYXBreGxsdXhpbXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjEwMDIsImV4cCI6MjA5MTgzNzAwMn0.qpCqvUTia4ywEMPSYJ_rIB4pSlk0zkvq5cQa-sFaFEs";
const SUPABASE_TABLE = "quran_data";
const SUPABASE_ENABLED = true;
// ✅ ADD THESE LINES
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
let realtimeChannel = null;
let isOwnChange = false;
// Real-time sync variables



// ============================================================
// QURAN MILESTONES - Partial Page Tracking
// ============================================================
let quranMilestones = {};

async function loadQuranMilestones() {
    try {
        const response = await fetch('quran_milestones.json');
        quranMilestones = await response.json();
        console.log('✅ Quran milestones loaded');
        return true;
    } catch (e) {
        console.error('❌ Failed to load milestones:', e);
        return false;
    }
}

function findPageForVerse(verseKey) {
    const [surahNum, verseNum] = verseKey.split(':').map(Number);
    let foundPage = null;
    for (let page = 1; page <= 604; page++) {
        const m = quranMilestones[page];
        if (!m) continue;
        const lastVerseKey = m.lastVerse;
        const [lastSurah, lastVerse] = lastVerseKey.split(':').map(Number);
        if (lastSurah > surahNum) return foundPage || page;
        if (lastSurah === surahNum) {
            foundPage = page;
            if (verseNum <= lastVerse) return page;
        }
    }
    return foundPage || 604;
}

function getFractionFromStart(verseKey, page) {
    const m = quranMilestones[page];
    if (!m) return 0;
    if (verseKey === "1:1") return 0;
    const [surah, verse] = verseKey.split(':').map(Number);
    if (verse === 1) return 0;
    if (verseKey === m.quarter) return 0.25;
    if (verseKey === m.half) return 0.50;
    if (verseKey === m.threeQuarter) return 0.75;
    if (verseKey === m.lastVerse) return 1.0;
    const quarter = m.quarter.split(':').map(Number)[1];
    const half = m.half.split(':').map(Number)[1];
    const threeQuarter = m.threeQuarter.split(':').map(Number)[1];
    const last = m.lastVerse.split(':').map(Number)[1];
    if (verse < quarter) return 0;
    if (verse < half) return 0.25;
    if (verse < threeQuarter) return 0.50;
    if (verse < last) return 0.75;
    return 1.0;
}

function getFractionToEnd(verseKey, page) {
    const m = quranMilestones[page];
    if (!m) return 0;
    const [surah, verse] = verseKey.split(':').map(Number);
    if (verseKey === "1:1") return 1.0;
    if (verse === 1) return 1.0;
    if (verseKey === m.quarter) return 0.75;
    if (verseKey === m.half) return 0.50;
    if (verseKey === m.threeQuarter) return 0.25;
    if (verseKey === m.lastVerse) return 0;
    const quarter = m.quarter.split(':').map(Number)[1];
    const half = m.half.split(':').map(Number)[1];
    const threeQuarter = m.threeQuarter.split(':').map(Number)[1];
    const last = m.lastVerse.split(':').map(Number)[1];
    if (verse <= quarter) return 0.75;
    if (verse <= half) return 0.50;
    if (verse <= threeQuarter) return 0.25;
    if (verse <= last) return 0;
    return 0;
}
// ============================================================
// SMART SYNC - Only runs when tab is active
// ============================================================
let isTabActive = true;
let hasUnsavedChanges = false;
let lastCloudUpdate = null;  // ✅ ADD THIS LINE
document.addEventListener('visibilitychange', function() {
    isTabActive = !document.hidden;
    console.log(isTabActive ? '👁️ Tab active' : '💤 Tab inactive');
});

// ============================================================
// SYNC FUNCTIONS (FIXED)
// ============================================================
async function syncToCloud() {
    if (!SUPABASE_ENABLED) return;
    if (!hasUnsavedChanges) {
        console.log('⏭️ No changes to sync');
        return;
    }

    isOwnChange = true;  // ✅ ADD THIS LINE
    
    const allData = {};
    // ... rest of function stays the same
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('quran_') || key.startsWith('studentCount_')) {
            allData[key] = localStorage.getItem(key);
        }
    }
    
    try {
        // Use PUT with upsert
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?key=eq.main_data`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                key: 'main_data',
                value: JSON.stringify(allData),
                updated_at: new Date().toISOString()
            })
        });
        
        // If PATCH fails (no row exists), use POST
               if (!response.ok && response.status === 404) {
            const postResponse = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    key: 'main_data',
                    value: JSON.stringify(allData),
                    updated_at: new Date().toISOString()
                })
            });
            
            if (postResponse.ok) {
                hasUnsavedChanges = false;  // ✅ ADD THIS LINE
                console.log('✅ Created in Supabase');
                lastCloudUpdate = Date.now();
            }
        } else if (response.ok) {
            hasUnsavedChanges = false;  // ✅ ADD THIS LINE
            console.log('✅ Synced to Supabase');
            lastCloudUpdate = Date.now();
        }    } catch (e) {
        console.error('Sync error:', e);
    }
    setTimeout(() => { isOwnChange = false; }, 2000);  // ✅ ADD THIS LINE
}

async function loadFromCloud() {
    if (!SUPABASE_ENABLED) return false;
    
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?key=eq.main_data&select=value,updated_at`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        const data = await response.json();
        
        // If cloud has data
        if (data && data[0] && data[0].value) {
            const cloudData = JSON.parse(data[0].value);
            
            // FIRST: Delete all local Quran data
            const keysToDelete = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('quran_') || key.startsWith('studentCount_')) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => localStorage.removeItem(key));
            
            // SECOND: Load cloud data into localStorage
            for (const key in cloudData) {
                localStorage.setItem(key, cloudData[key]);
            }
            
                        hasUnsavedChanges = false;  // ✅ ADD THIS LINE
            lastCloudUpdate = data[0].updated_at 
                ? new Date(data[0].updated_at).getTime() 
                : Date.now();
            
            console.log('✅ Loaded from Supabase');
            return true;
        }
        return false;
    } catch (e) {
        console.error('Load error:', e);
        return false;
    }
}


// ============================================================
// SESSION & GLOBALS
// ============================================================
function checkAuth() {
    console.log('🔐 checkAuth() running...');
    
    const session = sessionStorage.getItem('quranTrackerSession');
    console.log('Session:', session ? 'exists' : 'null');
    
    if (!session) { 
        console.log('❌ No session, redirecting to login');
        window.location.href = 'login.html'; 
        return false; 
    }
    try {
        const data = JSON.parse(session);
        console.log('Session data:', data);
        
        if (new Date(data.expiresAt) < new Date()) { 
            console.log('❌ Session expired');
            sessionStorage.removeItem('quranTrackerSession'); 
            window.location.href = 'login.html'; 
            return false; 
        }
        
        console.log('✅ Session valid, user:', data.displayName);
        document.getElementById('loggedInUser').textContent = `مرحباً، ${data.displayName}`;
        
        const overlay = document.getElementById('authCheckOverlay');
        if (overlay) overlay.classList.add('hidden');
        
        currentSection = 'highschool';
        document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('section-highschool')?.classList.add('active');
        
        updateAdminVisibility();
        
        return true;
    } catch (e) { 
        console.log('❌ Error parsing session:', e);
        sessionStorage.removeItem('quranTrackerSession'); 
        window.location.href = 'login.html'; 
        return false; 
    }
}
function logout() { 
    console.log('🚪 logout() called');
    if (confirm('تسجيل الخروج؟')) { 
        sessionStorage.removeItem('quranTrackerSession'); 
        window.location.href = 'login.html'; 
    }
}

// ✅ PASTE THE FUNCTION HERE
function isAdmin() {
    const session = JSON.parse(sessionStorage.getItem('quranTrackerSession') || '{}');
    return session.username === 'Admin.2123' || session.username === 'Tester10' || session.displayName === 'المدير';
}

function markDataChanged() {
    hasUnsavedChanges = true;
    console.log('📝 Data changed - pending sync');
}

function showToast(message, duration = 2500) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}



let surahsData = [];
let currentSection = 'highschool';
let currentStudentIndex = 0;
let totalStudents = 50;
let currentReportMonth = new Date();
let currentReportDate = new Date().toISOString().split('T')[0];
let currentAttendance = 'حاضر';
let currentPointsWeek = new Date();
let currentPointsMonth = new Date();

const SECTION_NAMES = { 
    highschool: 'ثانوي', 
    middleschool: 'متوسط', 
    elementary: 'ابتدائي' 
};
const ADMIN_PASSWORD = "224312";

// ============================================================
// SIDEBAR FUNCTIONS
// ============================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.add('show');
    overlay.classList.add('show');
    
    updateAdminVisibility();
     updateSidebarTrackerVisibility();  // ✅ ADD THIS
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.remove('show');
    overlay.classList.remove('show');
}

function updateAdminVisibility() {
    const adminElements = document.querySelectorAll('.admin-only');
    if (isAdmin()) {
        adminElements.forEach(el => el.classList.remove('hidden'));
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
    }
}

function updateSidebarTrackerVisibility() {
    const items = {
        tracker: document.getElementById('sidebar-tracker'),
        reports: document.querySelector('.sidebar-item[onclick*="reports"]'),
        points: document.querySelector('.sidebar-item[onclick*="points"]'),
        studentReports: document.querySelector('.sidebar-item[onclick*="studentReports"]'),
        history: document.getElementById('sidebar-history')
    };
    
    const isOnTracker = ['highschool', 'middleschool', 'elementary'].includes(currentSection);
    
    // Return to Tracker - show only when NOT on tracker
    if (items.tracker) {
        items.tracker.style.display = isOnTracker ? 'none' : 'flex';
    }
    
    // Reports - hide when on reports page
    if (items.reports) {
        items.reports.style.display = currentSection === 'reports' ? 'none' : 'flex';
    }
    
    // Points - hide when on points page
    if (items.points) {
        items.points.style.display = currentSection === 'points' ? 'none' : 'flex';
    }
    
    // Student Reports - hide when on student reports page
    if (items.studentReports) {
        items.studentReports.style.display = currentSection === 'studentReports' ? 'none' : 'flex';
    }
    
    // History - hide when on history page
    if (items.history && !items.history.classList.contains('hidden')) {
        items.history.style.display = currentSection === 'history' ? 'none' : 'flex';
    }
    // Settings - hide when on settings page
const settingsItem = document.getElementById('sidebar-settings');
if (settingsItem && !settingsItem.classList.contains('hidden')) {
    settingsItem.style.display = currentSection === 'settings' ? 'none' : 'flex';
   }
}

function navigateTo(page) {
    closeSidebar();
    
    switch(page) {
        case 'reports':
            switchSection('reports');
            break;
        case 'points':
            switchSection('points');
            break;
                    case 'pointsManagement':
            switchSection('pointsManagement');
            break;
        case 'studentReports':
            switchSection('studentReports');
            break;
        case 'history':
            switchSection('history');
            break;
        case 'settings':
            switchSection('settings');
            break;
    }
}
// ============================================================
// SURAH NAMES (114 Surahs)
// ============================================================
const SURAH_NAMES_AR = [
    "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
    "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
    "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
    "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
    "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
    "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
    "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
    "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
    "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
    "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
    "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
    "المسد", "الإخلاص", "الفلق", "الناس"
];

const AYAH_COUNTS = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
    123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
    112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
    34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
    54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
    60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
    14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
    28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
    29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
    15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
    11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
    5, 4, 5, 6
];


// ============================================================
// NEW PAGE CALCULATION USING VERSE MAPPING
// ============================================================
function calculatePages(startSurah, startVerse, endSurah, endVerse) {
    const startNum = isNaN(startSurah) ? getSurahNumberFromName(startSurah) : parseInt(startSurah);
    const endNum = isNaN(endSurah) ? getSurahNumberFromName(endSurah) : parseInt(endSurah);
    
    if (!startNum || !endNum) return 0;
    
    const startKey = `${startNum}:${startVerse}`;
    const endKey = `${endNum}:${endVerse}`;
    
    const startPage = findPageForVerse(startKey);
    const endPage = findPageForVerse(endKey);
    
    if (startPage === null || endPage === null) return 0;
    
    let totalPages = 0;
    
    if (startPage === endPage) {
        const startFrac = getFractionFromStart(startKey, startPage);
        const endFrac = getFractionFromStart(endKey, endPage);
        totalPages = endFrac - startFrac;
    } else {
        totalPages += getFractionToEnd(startKey, startPage);
        for (let p = startPage + 1; p < endPage; p++) {
            totalPages += 1;
        }
        totalPages += getFractionFromStart(endKey, endPage);
    }
    
    return Math.round(totalPages * 100) / 100;
}

function getSurahNumberFromName(name) {
    const surah = surahsData.find(s => s.name === name);
    return surah ? surah.number : null;
}
function initSearchableSelects() {
    document.querySelectorAll('select[data-searchable]').forEach(select => {
        if (select._searchableInitialized) return;
        select._searchableInitialized = true;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'searchable-select-wrapper';
        select.parentNode.insertBefore(wrapper, select);
        
        // Create display input
        const displayInput = document.createElement('div');
        displayInput.className = 'searchable-select-input';
        displayInput.textContent = select.options[select.selectedIndex]?.text || 'اختر السورة';
        wrapper.appendChild(displayInput);
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'searchable-select-dropdown';
        wrapper.appendChild(dropdown);
        
        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'searchable-select-search';
        searchInput.placeholder = '🔍 ابحث عن السورة...';
        searchInput.dir = 'rtl';
        dropdown.appendChild(searchInput);
        
        // Add options
        const optionsContainer = document.createElement('div');
        dropdown.appendChild(optionsContainer);
        
        function renderOptions(filter = '') {
            optionsContainer.innerHTML = '';
            Array.from(select.options).forEach(option => {
                if (option.value === '') return;
                const text = option.text;
                if (filter && !text.includes(filter)) return;
                
                const optionDiv = document.createElement('div');
                optionDiv.className = 'searchable-select-option';
                optionDiv.textContent = text;
                optionDiv.addEventListener('click', () => {
                    select.value = option.value;
                    displayInput.textContent = text;
                    dropdown.classList.remove('show');
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                });
                optionsContainer.appendChild(optionDiv);
            });
        }
        
        renderOptions();
        
        searchInput.addEventListener('input', (e) => {
            renderOptions(e.target.value);
        });
        
        displayInput.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.searchable-select-dropdown.show').forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });
            dropdown.classList.toggle('show');
            if (dropdown.classList.contains('show')) {
                renderOptions();
                searchInput.focus();
            }
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        // Hide original select
        select.style.display = 'none';
    });
}
// ============================================================
// DATE FUNCTIONS
// ============================================================
function getGregorianDate() {
    const date = new Date();
    const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    return `${weekdays[date.getDay()]}، ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

async function getHijriDate() {
    try {
        const d = new Date();
        const response = await fetch(`https://api.aladhan.com/v1/gToH?date=${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`);
        const data = await response.json();
        
        if (data.data && data.data.hijri) {
            const hijri = data.data.hijri;
            const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            const weekdayAr = hijri.weekday && hijri.weekday.ar ? hijri.weekday.ar : weekdays[d.getDay()];
            
            return `${weekdayAr} ${hijri.day} ${hijri.month.ar} ${hijri.year}`;
        }
        throw new Error('API failed');
    } catch (e) {
        return "جاري التحميل...";
    }
}

async function updateDateDisplay() { 
    document.getElementById('gregorianDate').textContent = getGregorianDate(); 
    document.getElementById('hijriDate').textContent = await getHijriDate(); 
}

// ============================================================
// LOAD QURAN DATA
// ============================================================
async function loadQuranData() {
    if (!checkAuth()) return;
    await updateDateDisplay();
    await loadFromCloud();
    await loadQuranMilestones();  // ✅ ADD THIS
    
    try { 
        const r = await fetch('https://api.alquran.cloud/v1/surah'); 
        const data = await r.json(); 
        
        surahsData = data.data.map((surah, index) => ({
            number: surah.number,
            name: SURAH_NAMES_AR[index] || surah.name,
            englishName: surah.englishName,
            numberOfAyahs: surah.numberOfAyahs
        }));
        
              switchSection('highschool');
    } catch (e) {
        surahsData = SURAH_NAMES_AR.map((name, index) => ({
            number: index + 1,
            name: name,
            englishName: name,
            numberOfAyahs: AYAH_COUNTS[index] || 10
        }));
        switchSection('highschool');
    }
}
function initApp() {
    loadStudentCounts();
    updateStudentDropdown();
    loadStudent(currentStudentIndex + 1);
    
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    document.getElementById('currentMonthDisplay').textContent = `${months[currentReportMonth.getMonth()]} ${currentReportMonth.getFullYear()}`;
    
    // ADD THIS: Initialize daily date display
    const dailyDisplay = document.getElementById('dailyDateDisplay');
    if (dailyDisplay) {
        dailyDisplay.textContent = new Date(currentReportDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    
       loadReportsData();
    loadDailyReport();
    loadPointsReport();
}

function loadStudentCounts() {
    if (!localStorage.getItem('studentCount_highschool')) { 
        localStorage.setItem('studentCount_highschool', '50'); 
        localStorage.setItem('studentCount_middleschool', '50'); 
        localStorage.setItem('studentCount_elementary', '50'); 
    }
    totalStudents = parseInt(localStorage.getItem(`studentCount_${currentSection}`) || '50');
}

// ============================================================
// STUDENT CARD RENDERING
// ============================================================
let rabtCounter = 0;

function loadStudent(studentNum) {
       // Clean up any existing searchable selects
    document.querySelectorAll('.searchable-select-wrapper').forEach(w => w.remove());    
    const sid = `${currentSection}-${studentNum}`;
    const saved = localStorage.getItem(`quran_${sid}`);
    let data = { 
        name: `طالب ${studentNum}`, 
        attendance: 'حاضر', 
        hasQuran: false, 
        hasUniform: false, 
        points: 0 
    };
    
          if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            // ✅ Only load name
            if (parsed.name && parsed.name !== '') {
                data.name = parsed.name;
            }
            // ✅ Always start with حاضر
        } catch(e) {}
    }
    
    currentAttendance = data.attendance || 'حاضر';
    
    let surahOptions = '';
    if (surahsData && surahsData.length > 0) {
       surahOptions = surahsData.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    } else {
        surahOptions = '<option value="1">الفاتحة</option><option value="2">البقرة</option>';
    }
    
    const container = document.getElementById('studentCardContainer');
    
    container.innerHTML = `
        <div class="student-card">
            <div class="card-header">
                <div class="student-number">${studentNum}</div>
                <input type="text" id="studentName" class="student-name-input" value="${data.name.replace(/"/g, '&quot;')}" placeholder="اسم الطالب">
            </div>
            <div class="task-section">
                <div class="task-header task-header-hifz">🔰 حفظ</div>
                <div class="task-body">
                    <div class="range-input">
                       <select id="hifzStartSurah" class="range-select" data-searchable onchange="updateStartVerses('hifz')"><option value="">اختر السورة</option>${surahOptions}</select>
                        <select id="hifzStartVerse" class="verse-select"><option value="">من آية</option></select>
                    </div>
                    <div class="range-input"><span class="arrow">⬇</span></div>
                    <div class="range-input">
<select id="hifzEndSurah" class="range-select" data-searchable onchange="updateEndVerses('hifz')"><option value="">اختر السورة</option>${surahOptions}</select>
                        <select id="hifzEndVerse" class="verse-select"><option value="">إلى آية</option></select>
                    </div>
                </div>
            </div>
            <div class="task-section">
                <div class="task-header task-header-rabt">🔗 ربط</div>
                <div class="task-body">
                    <div id="rabtContainer" class="rabt-list"></div>
                    <button class="add-btn" onclick="addRabtItem()">➕ إضافة سورة</button>
                </div>
            </div>
            <div class="task-section">
                <div class="task-header task-header-murajaa">📖 مراجعة</div>
                <div class="task-body">
                    <div class="range-input">
                    <select id="murajaaStartSurah" class="range-select" data-searchable onchange="updateStartVerses('murajaa')"><option value="">اختر السورة</option>${surahOptions}</select>
                        <select id="murajaaStartVerse" class="verse-select"><option value="">من آية</option></select>
                    </div>
                    <div class="range-input"><span class="arrow">⬇</span></div>
                    <div class="range-input">
                     <select id="murajaaEndSurah" class="range-select" data-searchable onchange="updateEndVerses('murajaa')"><option value="">اختر السورة</option>${surahOptions}</select>
                        <select id="murajaaEndVerse" class="verse-select"><option value="">إلى آية</option></select>
                    </div>
                </div>
            </div>
           <div class="attendance-row">
    <button class="attendance-btn ${currentAttendance === 'حاضر' ? 'active' : ''}" onclick="setAttendance('حاضر')">✅ حاضر</button>
    <button class="attendance-btn late ${currentAttendance === 'متأخر' ? 'active' : ''}" onclick="setAttendance('متأخر')">🕐 متأخر</button>
</div>
<div class="attendance-row">
    <button class="attendance-btn ${currentAttendance === 'غائب' ? 'active' : ''}" onclick="setAttendance('غائب')">❌ غائب</button>
    <button class="attendance-btn ${currentAttendance === 'معذور' ? 'active' : ''}" onclick="setAttendance('معذور')">⚠️ معذور</button>
</div>
            <div class="checks-row">
                <label class="check-item"><input type="checkbox" id="quranCheck"> 📚 مصحف</label>
<label class="check-item"><input type="checkbox" id="uniformCheck"> 👕 زي</label>
            </div>
            <div class="points-row">
                <span class="points-label">⭐ نقاط</span>
                <input type="number" id="pointsInput" class="points-input" min="0" max="100" value="">
            </div>
            <button class="save-btn" onclick="saveCurrentStudent()">💾 حفظ</button>
        </div>
    `;

     setTimeout(() => initSearchableSelects(), 50);  // ✅ ADD THIS LINE HERE
    
    rabtCounter = 0;
    document.getElementById('rabtContainer').innerHTML = '';
    if (data.rabt && data.rabt.length > 0) { 
        data.rabt.forEach(r => addRabtItem(r)); 
    } else { 
        addRabtItem(); 
    }
    
          if (data.hifz) {
        setTimeout(() => {
            const startSurah = document.getElementById('hifzStartSurah');
            if (startSurah) {
                startSurah.value = data.hifz.startSurah;
                updateStartVerses('hifz');
                setTimeout(() => {
                    document.getElementById('hifzStartVerse').value = data.hifz.startVerse;
                    const endSurah = document.getElementById('hifzEndSurah');
                    endSurah.value = data.hifz.endSurah;
                    updateEndVerses('hifz');
                    setTimeout(() => document.getElementById('hifzEndVerse').value = data.hifz.endVerse, 30);
                }, 30);
            }
        }, 120);
    }
    
        if (data.murajaa) {
        setTimeout(() => {
            const startSurah = document.getElementById('murajaaStartSurah');
            if (startSurah) {
                startSurah.value = data.murajaa.startSurah;
                updateStartVerses('murajaa');
                setTimeout(() => {
                    document.getElementById('murajaaStartVerse').value = data.murajaa.startVerse;
                    const endSurah = document.getElementById('murajaaEndSurah');
                    endSurah.value = data.murajaa.endSurah;
                    updateEndVerses('murajaa');
                    setTimeout(() => document.getElementById('murajaaEndVerse').value = data.murajaa.endVerse, 30);
                }, 30);
            }
        }, 120);
    }

}
function addRabtItem(existing = null) {
    const container = document.getElementById('rabtContainer');
    const id = `rabt-${Date.now()}-${rabtCounter++}`;
    
    let surahOptions = '';
    if (surahsData && surahsData.length > 0) {
        surahOptions = surahsData.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    } else {
        surahOptions = '<option value="1">الفاتحة</option><option value="2">البقرة</option>';
    }
    
    const div = document.createElement('div'); 
    div.className = 'rabt-item'; 
    div.id = id;
    div.innerHTML = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
            <button class="remove-btn" onclick="this.closest('.rabt-item').remove()">✖ حذف</button>
        </div>
        <div class="range-input">
            <select class="range-select rabt-start-surah" data-searchable onchange="updateRabtStartVerses('${id}')"><option value="">اختر السورة</option>${surahOptions}</select>
            <select class="verse-select rabt-start-verse"><option value="">من آية</option></select>
        </div>
        <div class="range-input"><span class="arrow">⬇</span></div>
        <div class="range-input">
            <select class="range-select rabt-end-surah" data-searchable onchange="updateRabtEndVerses('${id}')"><option value="">اختر السورة</option>${surahOptions}</select>
            <select class="verse-select rabt-end-verse"><option value="">إلى آية</option></select>
        </div>
    `;
    container.appendChild(div);
        if (existing) {
        setTimeout(() => {
            const item = document.getElementById(id);
            if (item) {
                const startSelect = item.querySelector('.rabt-start-surah');
                startSelect.value = existing.startSurah;
                updateRabtStartVerses(id);
                setTimeout(() => {
                    item.querySelector('.rabt-start-verse').value = existing.startVerse;
                    const endSelect = item.querySelector('.rabt-end-surah');
                    endSelect.value = existing.endSurah;
                    updateRabtEndVerses(id);
                    setTimeout(() => item.querySelector('.rabt-end-verse').value = existing.endVerse, 30);
                }, 30);
            }
        }, 30);
    }
    
      setTimeout(() => initSearchableSelects(), 50);
}

function updateVerseOptions(surahInput, selectEl, placeholder) {
    if (!surahInput) { 
        selectEl.innerHTML = `<option value="">${placeholder}</option>`; 
        return; 
    }
    // Check if input is a number or name
    const surah = !isNaN(surahInput) 
        ? surahsData.find(s => s.number == surahInput)
        : surahsData.find(s => s.name === surahInput);
    
    if (surah) { 
        let o = `<option value="">${placeholder}</option>`; 
        for (let i = 1; i <= surah.numberOfAyahs; i++) o += `<option value="${i}">${i}</option>`; 
        selectEl.innerHTML = o; 
    }
}

function updateStartVerses(task) { 
    const s = document.getElementById(`${task}StartSurah`)?.value; 
    updateVerseOptions(s, document.getElementById(`${task}StartVerse`), 'من آية'); 
}

function updateEndVerses(task) { 
    const s = document.getElementById(`${task}EndSurah`)?.value; 
    updateVerseOptions(s, document.getElementById(`${task}EndVerse`), 'إلى آية'); 
}

function updateRabtStartVerses(id) { 
    const s = document.querySelector(`#${id} .rabt-start-surah`)?.value; 
    updateVerseOptions(s, document.querySelector(`#${id} .rabt-start-verse`), 'من آية'); 
}

function updateRabtEndVerses(id) { 
    const s = document.querySelector(`#${id} .rabt-end-surah`)?.value; 
    updateVerseOptions(s, document.querySelector(`#${id} .rabt-end-verse`), 'إلى آية'); 
}

function setAttendance(val) { 
    currentAttendance = val; 
    document.querySelectorAll('.attendance-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.includes(val));
    });
}

function saveCurrentStudent() {
        if (!isHalaqaActive()) {
        showToast('⏸️ الحلقة متوقفة - لا يمكن الحفظ');
        return;
    }
    const studentNum = currentStudentIndex + 1;
    const sid = `${currentSection}-${studentNum}`;
    
    const nameInput = document.getElementById('studentName');
    const name = nameInput ? nameInput.value.trim() : '';
    const finalName = name || `طالب ${studentNum}`;
    
    const quran = document.getElementById('quranCheck')?.checked || false;
    const uniform = document.getElementById('uniformCheck')?.checked || false;
    const points = document.getElementById('pointsInput')?.value || 0;
    
    let hifz = null, murajaa = null;
    const rabt = [];
    
      const hs = document.getElementById('hifzStartSurah')?.value;
    const hsv = document.getElementById('hifzStartVerse')?.value;
    const he = document.getElementById('hifzEndSurah')?.value;
    const hev = document.getElementById('hifzEndVerse')?.value;
   if (hs && hsv && he && hev) {
    hifz = { 
        startSurah: hs, startVerse: hsv, endSurah: he, endVerse: hev, 
        startSurahName: hs,  // Now hs is the name directly
        endSurahName: he,    // Now he is the name directly
        pages: calculatePages(hs, hsv, he, hev)
    };
}
    
        const ms = document.getElementById('murajaaStartSurah')?.value;
    const msv = document.getElementById('murajaaStartVerse')?.value;
    const me = document.getElementById('murajaaEndSurah')?.value;
    const mev = document.getElementById('murajaaEndVerse')?.value;
    if (ms && msv && me && mev) {
    murajaa = { 
        startSurah: ms, startVerse: msv, endSurah: me, endVerse: mev, 
        startSurahName: ms,
        endSurahName: me,
        pages: calculatePages(ms, msv, me, mev)
    };
}
    
      document.querySelectorAll('.rabt-item').forEach(item => {
        const ss = item.querySelector('.rabt-start-surah')?.value;
        const sv = item.querySelector('.rabt-start-verse')?.value;
        const es = item.querySelector('.rabt-end-surah')?.value;
        const ev = item.querySelector('.rabt-end-verse')?.value;
       if (ss && sv && es && ev) {
    rabt.push({ 
        startSurah: ss, startVerse: sv, endSurah: es, endVerse: ev, 
        startSurahName: ss,
        endSurahName: es,
        pages: calculatePages(ss, sv, es, ev)
    });
}
    });
    
        const data = { 
        name: finalName, 
        section: currentSection, 
        attendance: currentAttendance, 
        hasQuran: quran, 
        hasUniform: uniform, 
        points: points, 
        hifz: hifz, 
        rabt: rabt, 
        murajaa: murajaa, 
        savedAt: new Date().toISOString() 
    };
    
    // ✅ ADD THIS LINE
    logTeacherAction(finalName, 'حفظ', getActionSummary(data));
    
    localStorage.setItem(`quran_${sid}`, JSON.stringify(data));    updateStudentDropdown();
    markDataChanged();  // ✅ ADD THIS LINE
    syncToCloud();
       showToast('✅ تم حفظ البيانات بنجاح!');
     const btn = event.target;
    if (btn) {
        btn.textContent = '✅ تم الحفظ!';
        setTimeout(() => btn.textContent = '💾 حفظ', 1500);
    }
    
    // ✅ Reset all task fields after save (keep only name and attendance)
    setTimeout(() => {
        // Reset hifz
        document.getElementById('hifzStartSurah').value = '';
        document.getElementById('hifzStartVerse').innerHTML = '<option value="">من آية</option>';
        document.getElementById('hifzEndSurah').value = '';
        document.getElementById('hifzEndVerse').innerHTML = '<option value="">إلى آية</option>';
        
               // Reset murajaa
        document.getElementById('murajaaStartSurah').value = '';
        document.getElementById('murajaaStartVerse').innerHTML = '<option value="">من آية</option>';
        document.getElementById('murajaaEndSurah').value = '';
        document.getElementById('murajaaEndVerse').innerHTML = '<option value="">إلى آية</option>';
        
        // Reset rabt container
        document.getElementById('rabtContainer').innerHTML = '';
        addRabtItem();
        
        // ✅ Uncheck mushaf and uniform
        document.getElementById('quranCheck').checked = false;
        document.getElementById('uniformCheck').checked = false;
        
               // ✅ Clear points (empty, not 0)
        document.getElementById('pointsInput').value = '';
        
        // ✅ Reset attendance to حاضر
        setAttendance('حاضر');
        
        // ✅ Reset searchable select display text
        document.querySelectorAll('.searchable-select-input').forEach(el => {
            el.textContent = 'اختر السورة';
        });
    }, 500);
}
// ============================================================
// NAVIGATION
// ============================================================
function switchSection(section) {
    currentSection = section;
    
    // Hide all sections
    document.querySelectorAll('.tracker-section').forEach(el => el.classList.add('hidden'));
        document.getElementById('pointsManagementView')?.classList.add('hidden');
    
    // Show selected section
    if (section === 'reports') {
        document.getElementById('reportsView').classList.remove('hidden');
        document.getElementById('trackerView').classList.add('hidden');
        document.getElementById('pointsView').classList.add('hidden');
        document.getElementById('studentReportsView')?.classList.add('hidden');
        document.getElementById('section-history')?.classList.add('hidden');
    } else if (section === 'points') {
        document.getElementById('pointsView').classList.remove('hidden');
        document.getElementById('trackerView').classList.add('hidden');
        document.getElementById('reportsView').classList.add('hidden');
        document.getElementById('studentReportsView')?.classList.add('hidden');
        document.getElementById('section-history')?.classList.add('hidden');
        initPointsTab();
            } else if (section === 'pointsManagement') {
        document.getElementById('pointsManagementView')?.classList.remove('hidden');
        document.getElementById('trackerView').classList.add('hidden');
        document.getElementById('reportsView').classList.add('hidden');
        document.getElementById('pointsView').classList.add('hidden');
        document.getElementById('studentReportsView')?.classList.add('hidden');
        document.getElementById('section-history')?.classList.add('hidden');
        document.getElementById('settingsView')?.classList.add('hidden');
        // Delay to ensure DOM is visible before initializing
        setTimeout(() => {
            initPointsManagement();
        }, 300);
    } 
    else if (section === 'studentReports') {
        document.getElementById('studentReportsView')?.classList.remove('hidden');
        document.getElementById('trackerView').classList.add('hidden');
        document.getElementById('reportsView').classList.add('hidden');
        document.getElementById('pointsView').classList.add('hidden');
        document.getElementById('section-history')?.classList.add('hidden');
        initStudentReportsTab();
    } else if (section === 'settings') {
    document.getElementById('settingsView')?.classList.remove('hidden');
    document.getElementById('trackerView').classList.add('hidden');
    document.getElementById('reportsView').classList.add('hidden');
    document.getElementById('pointsView').classList.add('hidden');
    document.getElementById('studentReportsView')?.classList.add('hidden');
    document.getElementById('section-history')?.classList.add('hidden');
    initSettingsTab();
    } else if (section === 'history') {
        document.getElementById('section-history')?.classList.remove('hidden');
        document.getElementById('trackerView').classList.add('hidden');
        document.getElementById('reportsView').classList.add('hidden');
        document.getElementById('pointsView').classList.add('hidden');
        document.getElementById('studentReportsView')?.classList.add('hidden');
    } else {
        document.getElementById('trackerView').classList.remove('hidden');
        document.getElementById('reportsView').classList.add('hidden');
        document.getElementById('pointsView').classList.add('hidden');
        document.getElementById('studentReportsView')?.classList.add('hidden');
        document.getElementById('section-history')?.classList.add('hidden');
    }
    
    // Update section tabs active state
    document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
    if (section === 'highschool') {
        document.getElementById('section-highschool')?.classList.add('active');
    } else if (section === 'middleschool') {
        document.getElementById('section-middleschool')?.classList.add('active');
    } else if (section === 'elementary') {
        document.getElementById('section-elementary')?.classList.add('active');
    }
    
    // Update admin visibility
    updateAdminVisibility();
    
    // Show/hide history sidebar item based on admin
    if (isAdmin()) {
        document.getElementById('sidebar-history')?.classList.remove('hidden');
        
    } else {
        document.getElementById('sidebar-history')?.classList.add('hidden');
         
    }
    
    if (section === 'history') {
        loadHistoryTab();
    } else if (section === 'reports') {
        loadReportsData();
        loadDailyReport();
        loadPointsReport();
    } else if (section === 'points') {
        // Already handled by initPointsTab()
    } else if (section === 'studentReports') {
        // We'll build this next
        console.log('Student Reports tab clicked');
    } else if (section !== 'history') {
        loadStudentCounts();
        currentStudentIndex = 0;
        updateStudentDropdown();
        loadStudent(1);
    }
      updateSidebarTrackerVisibility();  // ✅ ADD THIS
}
// ============================================================
// SIMPLE STUDENT DROPDOWN
// ============================================================

function updateStudentDropdown() {
    const select = document.getElementById('studentJumpSelect'); 
    if (!select) return;
    
    select.innerHTML = '';
    
    for (let i = 1; i <= totalStudents; i++) { 
        const saved = localStorage.getItem(`quran_${currentSection}-${i}`); 
        let name = `طالب ${i}`; 
        if (saved) { 
            try { 
                const d = JSON.parse(saved); 
                if (d.name) name = d.name; 
            } catch(e) {} 
        } 
        select.innerHTML += `<option value="${i}">${i} - ${name}</option>`; 
    }
    
    select.value = currentStudentIndex + 1;
}

function jumpToStudent() { 
    const select = document.getElementById('studentJumpSelect');
    if (select) {
        currentStudentIndex = parseInt(select.value) - 1; 
        loadStudent(currentStudentIndex + 1); 
    }
}

function prevStudent() { 
    if (currentStudentIndex > 0) { 
        currentStudentIndex--; 
        loadStudent(currentStudentIndex + 1); 
        updateStudentDropdown(); 
    } 
}

function nextStudent() { 
    if (currentStudentIndex < totalStudents - 1) { 
        currentStudentIndex++; 
        loadStudent(currentStudentIndex + 1); 
        updateStudentDropdown(); 
    } 
}
// ============================================================
// REPORTS
// ============================================================
function changeMonth(d) { 
    currentReportMonth.setMonth(currentReportMonth.getMonth() + d); 
    loadReportsData(); 
}

function changeDate(d) { 
    const dt = new Date(currentReportDate); 
    dt.setDate(dt.getDate() + d); 
    currentReportDate = dt.toISOString().split('T')[0]; 
    
    // Update the daily date display
    const displayEl = document.getElementById('dailyDateDisplay');
    if (displayEl) {
        displayEl.textContent = new Date(currentReportDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    
    loadDailyReport(); 
}

function loadReportsData() {
    const y = currentReportMonth.getFullYear(), m = currentReportMonth.getMonth();
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    document.getElementById('currentMonthDisplay').textContent = `${months[m]} ${y}`;
    
    const data = { 
        highschool: { hifz:0, rabt:0, murajaa:0, totalPages:0 }, 
        middleschool: { hifz:0, rabt:0, murajaa:0, totalPages:0 }, 
        elementary: { hifz:0, rabt:0, murajaa:0, totalPages:0 } 
    };
    
    for (let i = 0; i < localStorage.length; i++) { 
        const k = localStorage.key(i); 
        if (k.startsWith('quran_')) { 
            try { 
                const d = JSON.parse(localStorage.getItem(k)); 
                if (d?.savedAt && new Date(d.savedAt).getFullYear() === y && new Date(d.savedAt).getMonth() === m) { 
                    if (d.section && data[d.section]) {
                        if (d.hifz && d.hifz.pages) {
                            data[d.section].hifz += d.hifz.pages;
                            data[d.section].totalPages += d.hifz.pages;
                        }
                        if (d.rabt && d.rabt.length > 0) {
                            d.rabt.forEach(r => {
                                if (r.pages) {
                                    data[d.section].rabt += r.pages;
                                    data[d.section].totalPages += r.pages;
                                }
                            });
                        }
                        if (d.murajaa && d.murajaa.pages) {
                            data[d.section].murajaa += d.murajaa.pages;
                            data[d.section].totalPages += d.murajaa.pages;
                        }
                    } 
                } 
            } catch (e) {
                console.error('Error parsing data:', e);
            } 
        } 
    }
    
    // Display each section with pages AND khatmah
    ['highschool','middleschool','elementary'].forEach(s => { 
        const d = data[s]; 
        const hifzKhatmah = (d.hifz / 604).toFixed(2);
        const rabtKhatmah = (d.rabt / 604).toFixed(2);
        const murajaaKhatmah = (d.murajaa / 604).toFixed(2);
        const totalKhatmah = (d.totalPages / 604).toFixed(2);
        
        document.getElementById(`${s}-summary`).innerHTML = `
            <table class="summary-table">
                <thead>
                    <tr><th>المهمة</th><th>إجمالي الصفحات</th><th>إجمالي الختمات</th></tr>
                </thead>
                <tbody>
                    <tr><td>📖 حفظ</td><td>${d.hifz}</td><td>${hifzKhatmah}</td></tr>
                    <tr><td>🔗 ربط</td><td>${d.rabt}</td><td>${rabtKhatmah}</td></tr>
                    <tr><td>📚 مراجعة</td><td>${d.murajaa}</td><td>${murajaaKhatmah}</td></tr>
                    <tr class="total-row"><td><strong>📄 المجموع</strong></td><td><strong>${d.totalPages}</strong></td><td><strong>${totalKhatmah}</strong></td></tr>
                </tbody>
            </table>
        `; 
    });
    
    // Grand total
    const totalPages = data.highschool.totalPages + data.middleschool.totalPages + data.elementary.totalPages;
    const grandKhatmah = (totalPages / 604).toFixed(2);
    
    document.getElementById('grand-total-pages').textContent = totalPages; 
    document.getElementById('grand-total-khatmah').textContent = grandKhatmah;
}
function loadDailyReport() {
    // Check if selected date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(currentReportDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
        // Future date - show "no data" for all sections
        ['highschool', 'middleschool', 'elementary'].forEach(s => {
            const c = document.getElementById(`daily-${s}`);
            if (c) {
                c.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">لا توجد بيانات لهذا اليوم</div><div class="empty-sub">لم يحن هذا اليوم بعد</div></div>';
            }
        });
        return;
    }
        if (!isHalaqaActive()) {
        ['highschool', 'middleschool', 'elementary'].forEach(s => {
            const c = document.getElementById(`daily-${s}`);
            if (c) {
                c.innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-text">الحلقة لم تبدأ بعد</div><div class="empty-sub">يرجى بدء الحلقة من الإعدادات</div></div>';
            }
        });
        return;
    }
       
       
    
    ['highschool', 'middleschool', 'elementary'].forEach(s => {
        const c = document.getElementById(`daily-${s}`);
        if (!c) {
            console.error(`Container daily-${s} not found`);
            return;
        }
        
        const count = parseInt(localStorage.getItem(`studentCount_${s}`) || '50');
        
        // Collect all saved data for today
        const savedData = {};
        for (let i = 0; i < localStorage.length; i++) { 
            const k = localStorage.key(i); 
            if (k.startsWith(`quran_${s}-`)) { 
                try { 
                    const d = JSON.parse(localStorage.getItem(k)); 
                    if (d?.savedAt && new Date(d.savedAt).toISOString().split('T')[0] === currentReportDate) {
                        const studentNum = parseInt(k.split('-').pop());
                        savedData[studentNum] = d;
                    }
                } catch (e) {} 
            } 
        }
        
        // Build table with ALL students
        let h = '<table class="summary-table"><tr><th>#</th><th>الطالب</th><th>الحضور</th><th>حفظ</th><th>ربط</th><th>مراجعة</th><th>مصحف</th><th>زي</th><th>نقاط</th></tr>';
        
        for (let i = 1; i <= count; i++) {
            const d = savedData[i]; // Will be undefined if no data saved for this student today
            
            if (d) {
                // Student has saved data for today
                const hifzText = d.hifz ? `${d.hifz.startSurahName || ''} ${d.hifz.startVerse} ← ${d.hifz.endSurahName || ''} ${d.hifz.endVerse}` : '-';
                const rabtText = d.rabt?.length ? d.rabt.map(r => `${r.startSurahName || ''} ${r.startVerse} ← ${r.endSurahName || ''} ${r.endVerse}`).join('، ') : '-';
                const murajaaText = d.murajaa ? `${d.murajaa.startSurahName || ''} ${d.murajaa.startVerse} ← ${d.murajaa.endSurahName || ''} ${d.murajaa.endVerse}` : '-';
                const attendanceIcon = {'حاضر':'✅', 'متأخر':'🕐', 'غائب':'❌', 'معذور':'⚠️'}[d.attendance] || '';
                const attendanceDisplay = attendanceIcon ? `${attendanceIcon} ${d.attendance}` : d.attendance;
                h += `<tr>
                    <td>${i}</td>
                    <td>${d.name || '-'}</td>
                    <td>${attendanceDisplay}</td>
                    <td>${hifzText}</td>
                    <td>${rabtText}</td>
                    <td>${murajaaText}</td>
                    <td>${d.hasQuran ? '✅' : '❌'}</td>
                    <td>${d.hasUniform ? '✅' : '❌'}</td>
                    <td>${d.points || 0}</td>
                </tr>`;
            } else {
                // No data saved - show as absent with empty fields
                // Get student name from localStorage
                let name = `طالب ${i}`;
                const savedAny = localStorage.getItem(`quran_${s}-${i}`);
                if (savedAny) {
                    try {
                        const parsed = JSON.parse(savedAny);
                        if (parsed.name) name = parsed.name;
                    } catch(e) {}
                }
                
                h += `<tr>
                    <td>${i}</td>
                    <td>${name}</td>
                    <td>❌ غائب</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>❌</td>
                    <td>❌</td>
                    <td>0</td>
                </tr>`;
            }
        }
        
        c.innerHTML = h + '</table>';
    });
}
// ============================================================
// POINTS REPORTS - Weekly, Monthly, All-Time (STACKED)
// ============================================================

function loadPointsReport() {
    loadWeeklyPointsReport();
    loadMonthlyPointsReport();
    loadAllTimePointsReport();
}

function loadWeeklyPointsReport() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    ['highschool', 'middleschool', 'elementary'].forEach(section => {
        const container = document.getElementById(`points-weekly-${section}`);
        if (!container) {
            console.log(`Container points-weekly-${section} not found`);
            return;
        }
        
        const students = [];
        const count = parseInt(localStorage.getItem(`studentCount_${section}`) || '50');
        
        for (let i = 1; i <= count; i++) {
            const key = `quran_${section}-${i}`;
            const saved = localStorage.getItem(key);
            
            let name = `طالب ${i}`;
            let weeklyPoints = 0;
            
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.name) name = data.name;
                    if (data.points) weeklyPoints = parseInt(data.points) || 0;
                } catch (e) {}
            }
            
                       students.push({ number: i, name: name, points: weeklyPoints });
        }
        
        // Sort by points descending
        students.sort((a, b) => b.points - a.points);
        
        if (students.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-text">لا توجد نقاط</div><div class="empty-sub">لم يتم تسجيل نقاط بعد</div></div>';
            return;
        }
        
        let html = `
            <table class="summary-table">
                <thead><tr><th>#</th><th>الطالب</th><th>النقاط</th></tr></thead>
                <tbody>
        `;
        
        students.forEach((s, idx) => {
            html += `<tr><td>${idx + 1}</td><td>${s.name}</td><td>${s.points}</td></tr>`;
        });
        
        html += `</tbody></table>`;
        container.innerHTML = html;
    });
}

function loadMonthlyPointsReport() {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    ['highschool', 'middleschool', 'elementary'].forEach(section => {
        const container = document.getElementById(`points-monthly-${section}`);
        if (!container) {
            console.log(`Container points-monthly-${section} not found`);
            return;
        }
        
        const students = [];
        const count = parseInt(localStorage.getItem(`studentCount_${section}`) || '50');
        
        for (let i = 1; i <= count; i++) {
            const key = `quran_${section}-${i}`;
            const saved = localStorage.getItem(key);
            
            let name = `طالب ${i}`;
            let monthlyPoints = 0;
            
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.name) name = data.name;
                    if (data.points) monthlyPoints = parseInt(data.points) || 0;
                } catch (e) {}
            }
            
                        students.push({ number: i, name: name, points: monthlyPoints });
        }
        
        students.sort((a, b) => b.points - a.points);
        
        if (students.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-text">لا توجد نقاط</div><div class="empty-sub">لم يتم تسجيل نقاط بعد</div></div>';
            return;
        }
        
        let html = `
            <table class="summary-table">
                <thead><tr><th>#</th><th>الطالب</th><th>النقاط</th></tr></thead>
                <tbody>
        `;
        
        students.forEach((s, idx) => {
            html += `<tr><td>${idx + 1}</td><td>${s.name}</td><td>${s.points}</td></tr>`;
        });
        
        html += `</tbody></table>`;
        container.innerHTML = html;
    });
}

function loadAllTimePointsReport() {
    ['highschool', 'middleschool', 'elementary'].forEach(section => {
        const container = document.getElementById(`points-alltime-${section}`);
        if (!container) {
            console.log(`Container points-alltime-${section} not found`);
            return;
        }
        
        const students = [];
        const count = parseInt(localStorage.getItem(`studentCount_${section}`) || '50');
        
        for (let i = 1; i <= count; i++) {
            const key = `quran_${section}-${i}`;
            const saved = localStorage.getItem(key);
            
            let name = `طالب ${i}`;
            let totalPoints = 0;
            
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.name) name = data.name;
                    if (data.points) totalPoints = parseInt(data.points) || 0;
                } catch (e) {}
            }
            
                    students.push({ number: i, name: name, points: totalPoints });
        }
        
        students.sort((a, b) => b.points - a.points);
        
        if (students.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-text">لا توجد نقاط</div><div class="empty-sub">لم يتم تسجيل نقاط بعد</div></div>';
            return;
        }
        
        let html = `
            <table class="summary-table">
                <thead><tr><th>#</th><th>الطالب</th><th>النقاط</th></tr></thead>
                <tbody>
        `;
        
        students.forEach((s, idx) => {
            html += `<tr><td>${idx + 1}</td><td>${s.name}</td><td>${s.points}</td></tr>`;
        });
        
        html += `</tbody></table>`;
        container.innerHTML = html;
    });
}
// ============================================================
// POINTS TAB FUNCTIONS - NEW LAYOUT
// ============================================================

function initPointsTab() {
    updateWeekDisplay();
    updatePointsMonthDisplay();
    loadWeeklyPointsColumns();
}

function switchPointsTab(period) {
    // Hide all views
    document.getElementById('points-weekly-view').classList.add('hidden');
    document.getElementById('points-monthly-view').classList.add('hidden');
    document.getElementById('points-alltime-view').classList.add('hidden');
    
    // Remove active class from all tabs
    document.querySelectorAll('.points-main-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected view
    if (period === 'weekly') {
        document.getElementById('points-weekly-view').classList.remove('hidden');
        document.querySelectorAll('.points-main-tab')[0].classList.add('active');
        loadWeeklyPointsColumns();
    } else if (period === 'monthly') {
        document.getElementById('points-monthly-view').classList.remove('hidden');
        document.querySelectorAll('.points-main-tab')[1].classList.add('active');
        loadMonthlyPointsColumns();
    } else {
        document.getElementById('points-alltime-view').classList.remove('hidden');
        document.querySelectorAll('.points-main-tab')[2].classList.add('active');
        loadAllTimePointsColumns();
    }
}

// Week Functions
function changeWeek(delta) {
    currentPointsWeek.setDate(currentPointsWeek.getDate() + (delta * 7));
    updateWeekDisplay();
    loadWeeklyPointsColumns();
}

function updateWeekDisplay() {
    const weekStart = new Date(currentPointsWeek);
    weekStart.setDate(currentPointsWeek.getDate() - currentPointsWeek.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthName = months[weekStart.getMonth()];
    
    // Calculate week number
    const firstDayOfMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
    const weekNumber = Math.ceil((weekStart.getDate() + firstDayOfMonth.getDay()) / 7);
    
    const display = document.getElementById('currentWeekDisplay');
    if (display) {
        display.textContent = `${monthName} - الأسبوع ${weekNumber} (${weekStart.getDate()}/${weekStart.getMonth()+1} - ${weekEnd.getDate()}/${weekEnd.getMonth()+1})`;
    }
}

function loadWeeklyPointsColumns() {
    const weekStart = new Date(currentPointsWeek);
    weekStart.setDate(currentPointsWeek.getDate() - currentPointsWeek.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    ['highschool', 'middleschool', 'elementary'].forEach(section => {
        const container = document.getElementById(`points-weekly-${section}`);
        if (!container) return;
        
        const students = [];
        const count = parseInt(localStorage.getItem(`studentCount_${section}`) || '50');
        
        for (let i = 1; i <= count; i++) {
            const key = `quran_${section}-${i}`;
            const saved = localStorage.getItem(key);
            
            let name = `طالب ${i}`;
            let points = 0;
            
                       if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.name) name = data.name;
                    // Check BOTH: daily saved records AND pointsUpdatedAt for PM changes
                    if (data.savedAt) {
                        const savedDate = new Date(data.savedAt);
                        if (savedDate >= weekStart && savedDate <= weekEnd) {
                            points = parseInt(data.points) || 0;
                        }
                    }
                    // Also check for points management updates this week
                    if (data.pointsUpdatedAt) {
                        const pmDate = new Date(data.pointsUpdatedAt);
                        if (pmDate >= weekStart && pmDate <= weekEnd) {
                            points = parseInt(data.points) || 0;
                        }
                    }
                } catch (e) {}
            }
            
                       students.push({ number: i, name: name, points: points });
        }
        
        students.sort((a, b) => b.points - a.points);
        
        
        let html = `<table class="points-table"><thead><tr><th>#</th><th>الاسم</th><th>النقاط</th></tr></thead><tbody>`;
        students.forEach((s, idx) => {
            html += `<tr><td>${idx + 1}</td><td class="student-name">${s.name}</td><td class="points-value">${s.points}</td></tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    });
}

// Month Functions
function changePointsMonth(delta) {
    currentPointsMonth.setMonth(currentPointsMonth.getMonth() + delta);
    updatePointsMonthDisplay();
    loadMonthlyPointsColumns();
}

function updatePointsMonthDisplay() {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const display = document.getElementById('currentPointsMonthDisplay');
    if (display) {
        display.textContent = `${months[currentPointsMonth.getMonth()]} ${currentPointsMonth.getFullYear()}`;
    }
}

function loadMonthlyPointsColumns() {
    const year = currentPointsMonth.getFullYear();
    const month = currentPointsMonth.getMonth();
    
    ['highschool', 'middleschool', 'elementary'].forEach(section => {
        const container = document.getElementById(`points-monthly-${section}`);
        if (!container) return;
        
        const students = [];
        const count = parseInt(localStorage.getItem(`studentCount_${section}`) || '50');
        
        for (let i = 1; i <= count; i++) {
            const key = `quran_${section}-${i}`;
            const saved = localStorage.getItem(key);
            
            let name = `طالب ${i}`;
            let points = 0;
            
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.name) name = data.name;
                    if (data.savedAt) {
                        const savedDate = new Date(data.savedAt);
                        if (savedDate.getFullYear() === year && savedDate.getMonth() === month) {
                            points = parseInt(data.points) || 0;
                        }
                    }
                    if (data.pointsUpdatedAt) {
                        const pmDate = new Date(data.pointsUpdatedAt);
                        if (pmDate.getFullYear() === year && pmDate.getMonth() === month) {
                            points = parseInt(data.points) || 0;
                        }
                    }
                } catch (e) {}
            }
            
            students.push({ number: i, name: name, points: points });
        }
        
        students.sort((a, b) => b.points - a.points);
        
        let html = `<table class="points-table"><thead><tr><th>#</th><th>الاسم</th><th>النقاط</th></tr></thead><tbody>`;
        students.forEach((s, idx) => {
            html += `<tr><td>${idx + 1}</td><td class="student-name">${s.name}</td><td class="points-value">${s.points}</td></tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    });
}

// All-Time Functions
function loadAllTimePointsColumns() {
    ['highschool', 'middleschool', 'elementary'].forEach(section => {
        const container = document.getElementById(`points-alltime-${section}`);
        if (!container) return;
        
        const students = [];
        const count = parseInt(localStorage.getItem(`studentCount_${section}`) || '50');
        
        for (let i = 1; i <= count; i++) {
            const key = `quran_${section}-${i}`;
            const saved = localStorage.getItem(key);
            
            let name = `طالب ${i}`;
            let points = 0;
            
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.name) name = data.name;
                    if (data.points) points = parseInt(data.points) || 0;
                } catch (e) {}
            }
            
                       students.push({ number: i, name: name, points: points });
        }
        
        students.sort((a, b) => b.points - a.points);
        
        
        
        let html = `<table class="points-table"><thead><tr><th>#</th><th>الاسم</th><th>النقاط</th></tr></thead><tbody>`;
        students.forEach((s, idx) => {
            html += `<tr><td>${idx + 1}</td><td class="student-name">${s.name}</td><td class="points-value">${s.points}</td></tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    });
}


// ============================================================
// SHARED PDF STYLES - Beautiful Islamic Green Theme
// ============================================================
function getPDFStyles() {
    return `
        <style>
            * {
                font-family: 'Cairo', sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            body {
                direction: rtl;
                padding: 40px;
                background: #f8fafc;
                color: #1f2937;
            }
            
            /* Header */
            .pdf-header {
                background: linear-gradient(to left, #059669, #047857, #065f46);
                color: white;
                padding: 24px;
                border-radius: 16px;
                text-align: center;
                margin-bottom: 24px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .pdf-header h1 {
                margin: 0 0 8px 0;
                font-size: 28px;
                color: white;
            }
            .pdf-header .subtitle {
                font-size: 16px;
                opacity: 0.9;
            }
            
            /* Date Info */
            .date-info {
                background: white;
                padding: 16px;
                border-radius: 12px;
                text-align: center;
                margin-bottom: 24px;
                border: 2px solid #e5e7eb;
                color: #047857;
                font-weight: 600;
            }
            
            /* Section Cards */
                       .section-card {
                background: white;
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                border: 1px solid #e5e7eb;
                page-break-inside: avoid;
            }
            .section-card h2 {
                color: #065f46;
                margin: 0 0 16px 0;
                padding-bottom: 8px;
                border-bottom: 2px solid #059669;
                font-size: 20px;
            }
            
            /* Tables */
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
                font-size: 14px;
            }
            thead th {
                background: #047857;
                color: white;
                padding: 12px 8px;
                text-align: center;
                font-weight: 700;
                font-size: 13px;
                border: 1px solid #036645;
            }
            tbody td {
                padding: 10px 8px;
                text-align: center;
                border-bottom: 1px solid #e5e7eb;
                background: white;
            }
            tbody tr:nth-child(even) td {
                background: #f0fdf4;
            }
            tbody tr:hover td {
                background: #d1fae5;
            }
            .total-row td {
                background: #ecfdf5 !important;
                font-weight: 700;
                font-size: 15px;
                color: #065f46;
                border-top: 2px solid #059669;
            }
            
            /* Attendance Badges */
            .badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
            }
            .badge-present { background: #dcfce7; color: #15803d; }
            .badge-late { background: #fef3c7; color: #b45309; }
            .badge-absent { background: #fee2e2; color: #dc2626; }
            .badge-excused { background: #fef3c7; color: #b45309; }
            
            /* Stats Grid */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin: 20px 0;
            }
            .stat-card {
                background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
                padding: 16px;
                border-radius: 12px;
                text-align: center;
                border: 2px solid #d1fae5;
            }
            .stat-card .stat-value {
                font-size: 24px;
                font-weight: 700;
                color: #059669;
            }
            .stat-card .stat-label {
                font-size: 13px;
                color: #047857;
                margin-top: 4px;
            }
            
            /* Grand Total */
            .grand-total {
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                color: white;
                padding: 24px;
                border-radius: 16px;
                text-align: center;
                margin-top: 24px;
            }
            .grand-total h2 {
                color: white;
                border-bottom: 1px solid rgba(255,255,255,0.3);
                padding-bottom: 12px;
            }
            .grand-total .big-number {
                font-size: 48px;
                font-weight: 700;
                margin: 16px 0;
            }
            
            /* Footer */
                        .pdf-footer {
                text-align: center;
                margin-top: 20px;
                padding: 12px;
                color: #6b7280;
                font-size: 12px;
                border-top: 1px solid #e5e7eb;
                page-break-before: auto;
            }
            
            /* Print Button */
            .print-btn {
                background: #059669;
                color: white;
                padding: 12px 32px;
                border: none;
                border-radius: 40px;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                margin: 24px auto;
                display: block;
                font-family: 'Cairo', sans-serif;
            }
            .print-btn:hover {
                background: #047857;
            }
            
            /* Three Column Layout */
            .columns {
                display: flex;
                gap: 16px;
                margin: 20px 0;
            }
            .column {
                flex: 1;
                background: white;
                border-radius: 16px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }
            .column h3 {
                color: #047857;
                text-align: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 2px solid #059669;
            }
            
                       /* Print Optimization */
                         @media print {
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body { 
                    background: white;
                    padding: 10px;
                }
                .print-btn { 
                    display: none !important; 
                }
                .section-card {
                    break-inside: avoid;
                    box-shadow: none;
                    page-break-after: auto;
                }
                table {
                    font-size: 12px;
                }
                .pdf-footer {
                    margin-top: 15px;
                    padding: 10px;
                }
            }
            
            @page {
                margin: 15px;
                size: A4;
            }
        </style>
    `;
}

// ============================================================
// DAILY REPORT EXPORT - Beautiful Design
// ============================================================
function exportDailyReport(l) { 
    const el = document.getElementById(`daily-${l}`); 
    if (!el || el.querySelector('.no-data')) { 
        alert('لا توجد بيانات للتصدير'); 
        return; 
    } 
    
    const sectionName = SECTION_NAMES[l];
    const sectionEmoji = { highschool: '🏫', middleschool: '🏫', elementary: '🏫' }[l];
    const dateStr = currentReportDate;
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    
    // Get table and enhance it
    const table = el.querySelector('table');
    const tableHTML = table ? table.outerHTML : el.innerHTML;
    
    // Parse and rebuild table with badges
    let enhancedHTML = tableHTML;
    enhancedHTML = enhancedHTML.replace(/✅/g, '<span class="badge badge-present">✅</span>');
    enhancedHTML = enhancedHTML.replace(/❌/g, '<span class="badge badge-absent">❌</span>');
    enhancedHTML = enhancedHTML.replace(/🕐/g, '<span class="badge badge-late">🕐</span>');
    enhancedHTML = enhancedHTML.replace(/⚠️/g, '<span class="badge badge-excused">⚠️</span>');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>التقرير اليومي - ${sectionName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            ${getPDFStyles()}
        </head>
        <body>
            <div class="pdf-header">
                <h1>📋 التقرير اليومي</h1>
                <div class="subtitle">${sectionEmoji} المرحلة ${sectionName} | ${dateStr}</div>
            </div>
            
            <div class="date-info">
                📅 ${hDate} &nbsp;|&nbsp; 📆 ${gDate}
            </div>
            
            <div class="section-card">
                <h2>${sectionEmoji} المرحلة ${sectionName}</h2>
                ${enhancedHTML}
            </div>
            
            <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
            
            <div class="pdf-footer">
                تم إنشاؤه بواسطة سجل متابعة الحلقات | ${new Date().toLocaleDateString('ar-SA')}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ============================================================
// MONTHLY REPORT EXPORT - Beautiful Design
// ============================================================
function exportMonthlyReport(l) { 
    const sectionName = SECTION_NAMES[l];
    const sectionEmoji = { highschool: '🏫', middleschool: '🏫', elementary: '🏫' }[l];
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const monthStr = `${months[currentReportMonth.getMonth()]} ${currentReportMonth.getFullYear()}`;
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    const summaryHTML = document.getElementById(`${l}-summary`).innerHTML;
    
    // Extract khatmah values for display
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = summaryHTML;
    const rows = tempDiv.querySelectorAll('tr');
    let hifzKhatmah = '-', rabtKhatmah = '-', murajaaKhatmah = '-', totalKhatmah = '-';
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
            const label = cells[0].textContent.trim();
            if (label.includes('حفظ')) hifzKhatmah = cells[2].textContent.trim();
            if (label.includes('ربط')) rabtKhatmah = cells[2].textContent.trim();
            if (label.includes('مراجعة')) murajaaKhatmah = cells[2].textContent.trim();
            if (label.includes('المجموع')) totalKhatmah = cells[2].textContent.trim();
        }
    });
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>التقرير الشهري - ${sectionName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            ${getPDFStyles()}
        </head>
        <body>
            <div class="pdf-header">
                <h1>📊 التقرير الشهري</h1>
                <div class="subtitle">${sectionEmoji} المرحلة ${sectionName} | ${monthStr}</div>
            </div>
            
            <div class="date-info">
                📅 ${hDate} &nbsp;|&nbsp; 📆 ${gDate}
            </div>
            
            <div class="section-card">
                <h2>${sectionEmoji} المرحلة ${sectionName}</h2>
                ${summaryHTML}
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${hifzKhatmah}</div>
                    <div class="stat-label">📖 ختمات الحفظ</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${rabtKhatmah}</div>
                    <div class="stat-label">🔗 ختمات الربط</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${murajaaKhatmah}</div>
                    <div class="stat-label">📚 ختمات المراجعة</div>
                </div>
            </div>
            
            <div class="grand-total">
                <h2>🎯 المجموع الكلي للمرحلة</h2>
                <div class="big-number">${totalKhatmah} ختمة</div>
            </div>
            
            <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
            
            <div class="pdf-footer">
                تم إنشاؤه بواسطة سجل متابعة الحلقات | ${new Date().toLocaleDateString('ar-SA')}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ============================================================
// GRAND TOTAL EXPORT - Beautiful Design
// ============================================================
function exportGrandTotal() {
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const monthStr = `${months[currentReportMonth.getMonth()]} ${currentReportMonth.getFullYear()}`;
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    
    const highHTML = document.getElementById('highschool-summary').innerHTML;
    const middleHTML = document.getElementById('middleschool-summary').innerHTML;
    const elemHTML = document.getElementById('elementary-summary').innerHTML;
    const totalPages = document.getElementById('grand-total-pages').textContent;
    const totalKhatmah = document.getElementById('grand-total-khatmah').textContent;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>التقرير الشامل</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            ${getPDFStyles()}
        </head>
        <body>
            <div class="pdf-header">
                <h1>📊 التقرير الشامل</h1>
                <div class="subtitle">جميع المراحل الدراسية | ${monthStr}</div>
            </div>
            
            <div class="date-info">
                📅 ${hDate} &nbsp;|&nbsp; 📆 ${gDate}
            </div>
            
            <div class="columns">
                <div class="column">
                    <h3>🏫 المرحلة الثانوية</h3>
                    ${highHTML}
                </div>
                <div class="column">
                    <h3>🏫 المرحلة المتوسطة</h3>
                    ${middleHTML}
                </div>
                <div class="column">
                    <h3>🏫 المرحلة الابتدائية</h3>
                    ${elemHTML}
                </div>
            </div>
            
            <div class="grand-total">
                <h2>🎯 إجمالي الختمات لجميع المراحل</h2>
                <div class="big-number">${totalKhatmah} ختمة</div>
                <div style="font-size: 18px; opacity: 0.9;">إجمالي الصفحات: ${totalPages} صفحة</div>
            </div>
            
            <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
            
            <div class="pdf-footer">
                تم إنشاؤه بواسطة سجل متابعة الحلقات | ${new Date().toLocaleDateString('ar-SA')}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ============================================================
// ALL POINTS REPORT EXPORT - Beautiful Design
// ============================================================
function exportAllPointsReport(period) {
    const periodNames = { 'weekly': 'الأسبوعي', 'monthly': 'الشهري', 'alltime': 'الكلي' };
    const periodName = periodNames[period];
    const periodEmoji = { 'weekly': '📅', 'monthly': '📆', 'alltime': '🏆' }[period];
    
    let highHTML, middleHTML, elemHTML;
    
    if (period === 'weekly') {
        highHTML = document.getElementById('points-weekly-highschool').innerHTML;
        middleHTML = document.getElementById('points-weekly-middleschool').innerHTML;
        elemHTML = document.getElementById('points-weekly-elementary').innerHTML;
    } else if (period === 'monthly') {
        highHTML = document.getElementById('points-monthly-highschool').innerHTML;
        middleHTML = document.getElementById('points-monthly-middleschool').innerHTML;
        elemHTML = document.getElementById('points-monthly-elementary').innerHTML;
    } else {
        highHTML = document.getElementById('points-alltime-highschool').innerHTML;
        middleHTML = document.getElementById('points-alltime-middleschool').innerHTML;
        elemHTML = document.getElementById('points-alltime-elementary').innerHTML;
    }
    
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    
    let dateInfo = '';
    if (period === 'weekly') {
        dateInfo = document.getElementById('currentWeekDisplay')?.textContent || '';
    } else if (period === 'monthly') {
        dateInfo = document.getElementById('currentPointsMonthDisplay')?.textContent || '';
    } else {
        dateInfo = 'كامل الفترة';
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير النقاط ${periodName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            ${getPDFStyles()}
        </head>
        <body>
            <div class="pdf-header">
                <h1>⭐ تقرير النقاط ${periodName}</h1>
                <div class="subtitle">${periodEmoji} ${dateInfo}</div>
            </div>
            
            <div class="date-info">
                📅 ${hDate} &nbsp;|&nbsp; 📆 ${gDate}
            </div>
            
            <div class="columns">
                <div class="column">
                    <h3>🏫 ثانوي</h3>
                    ${highHTML}
                </div>
                <div class="column">
                    <h3>🏫 متوسط</h3>
                    ${middleHTML}
                </div>
                <div class="column">
                    <h3>🏫 ابتدائي</h3>
                    ${elemHTML}
                </div>
            </div>
            
            <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
            
            <div class="pdf-footer">
                تم إنشاؤه بواسطة سجل متابعة الحلقات | ${new Date().toLocaleDateString('ar-SA')}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ============================================================
// INDIVIDUAL POINTS REPORT EXPORT - Beautiful Design
// ============================================================
function exportPointsReport(level, period = 'alltime') {
    const sectionName = SECTION_NAMES[level];
    const sectionEmoji = { highschool: '🏫', middleschool: '🏫', elementary: '🏫' }[level];
    const periodNames = { 'weekly': 'الأسبوعي', 'monthly': 'الشهري', 'alltime': 'الكلي' };
    const periodName = periodNames[period] || 'الكلي';
    
    let container;
    if (period === 'weekly') {
        container = document.getElementById(`points-weekly-${level}`);
    } else if (period === 'monthly') {
        container = document.getElementById(`points-monthly-${level}`);
    } else {
        container = document.getElementById(`points-alltime-${level}`);
    }
    
    if (!container) {
        alert('لا توجد بيانات للتصدير');
        return;
    }
    
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير النقاط - ${sectionName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            ${getPDFStyles()}
        </head>
        <body>
            <div class="pdf-header">
                <h1>⭐ تقرير النقاط ${periodName}</h1>
                <div class="subtitle">${sectionEmoji} المرحلة ${sectionName}</div>
            </div>
            
            <div class="date-info">
                📅 ${hDate} &nbsp;|&nbsp; 📆 ${gDate}
            </div>
            
            <div class="section-card">
                <h2>${sectionEmoji} المرحلة ${sectionName}</h2>
                ${container.innerHTML}
            </div>
            
            <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
            
            <div class="pdf-footer">
                تم إنشاؤه بواسطة سجل متابعة الحلقات | ${new Date().toLocaleDateString('ar-SA')}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ============================================================
// STUDENT REPORT EXPORT - Beautiful Design
// ============================================================
function exportStudentReportPDF() {
    if (!currentSelectedStudent) {
        alert('الرجاء اختيار طالب أولاً');
        return;
    }
    
    const title = document.getElementById('studentReportTitle')?.textContent || 'تقرير الطالب';
    const tableHTML = document.getElementById('studentReportTable')?.outerHTML || '';
    const statsHTML = document.getElementById('studentReportStats')?.innerHTML || '';
    
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            ${getPDFStyles()}
        </head>
        <body>
            <div class="pdf-header">
                <h1>👤 تقرير الطالب</h1>
                <div class="subtitle">${title}</div>
            </div>
            
            <div class="date-info">
                📅 ${hDate} &nbsp;|&nbsp; 📆 ${gDate}
            </div>
            
            <div class="section-card">
                <h2>📋 التفاصيل اليومية</h2>
                ${tableHTML}
            </div>
            
            <div class="section-card">
                <h2>📊 إحصائيات الشهر</h2>
                <div class="stats-grid">
                    ${statsHTML.replace(/<div/g, '<div class="stat-card"')}
                </div>
            </div>
            
            <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
            
            <div class="pdf-footer">
                تم إنشاؤه بواسطة سجل متابعة الحلقات | ${new Date().toLocaleDateString('ar-SA')}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ============================================================
// HISTORY EXPORT - Beautiful Design
// ============================================================
function exportHistoryPDF() {
    const teacherFilter = document.getElementById('historyTeacherFilter')?.value || 'all';
    const sectionFilter = document.getElementById('historySectionFilter')?.value || 'all';
    const dateFilter = document.getElementById('historyDateFilter')?.value;
    
    let filtered = allHistoryLogs;
    
    if (teacherFilter !== 'all') {
        filtered = filtered.filter(log => log.teacherName === teacherFilter || log.teacher_name === teacherFilter);
    }
    if (sectionFilter !== 'all') {
        filtered = filtered.filter(log => log.section === sectionFilter);
    }
    if (dateFilter) {
        filtered = filtered.filter(log => {
            const logDate = (log.timestamp || log.created_at).split('T')[0];
            return logDate === dateFilter;
        });
    }
    
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    
    let filtersText = [];
    if (teacherFilter !== 'all') filtersText.push('👤 المعلم: ' + teacherFilter);
    if (sectionFilter !== 'all') filtersText.push('🏫 المرحلة: ' + sectionFilter);
    if (dateFilter) filtersText.push('📅 التاريخ: ' + dateFilter);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>سجل التغييرات</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            ${getPDFStyles()}
        </head>
        <body>
            <div class="pdf-header">
                <h1>📜 سجل التغييرات</h1>
                <div class="subtitle">سجل المعلمين - المشرف</div>
            </div>
            
            <div class="date-info">
                📅 ${hDate} &nbsp;|&nbsp; 📆 ${gDate}
                ${filtersText.length > 0 ? '<br>' + filtersText.join(' &nbsp;|&nbsp; ') : ''}
            </div>
            
            <div class="section-card">
                <h2>📜 سجل التغييرات</h2>
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ والوقت</th>
                            <th>المعلم</th>
                            <th>الطالب</th>
                            <th>المرحلة</th>
                            <th>الإجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(log => {
                            const date = new Date(log.timestamp || log.created_at).toLocaleString('ar-SA');
                            const teacher = log.teacherName || log.teacher_name || '-';
                            const student = log.studentName || log.student_name || '-';
                            const section = log.section || '-';
                            const details = log.details || '-';
                            return `
                                <tr>
                                    <td>${date}</td>
                                    <td>${teacher}</td>
                                    <td>${student}</td>
                                    <td>${section}</td>
                                    <td>${details}</td>
                                </tr>
                            `;
                        }).join('')}
                        ${filtered.length === 0 ? '<tr><td colspan="5" style="text-align:center;">لا توجد سجلات</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
            
            <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
            
            <div class="pdf-footer">
                تم إنشاؤه بواسطة سجل متابعة الحلقات | ${new Date().toLocaleDateString('ar-SA')}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ============================================================
// SETTINGS FUNCTIONS
// ============================================================
let settingsSection = 'highschool';

function initSettingsTab() {
    switchSettingsSection('highschool');
        updateHalaqaButtons();
}

function switchSettingsSection(section) {
    settingsSection = section;
    
    // Update tabs
    document.querySelectorAll('#settingsView .section-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`settings-${section}`)?.classList.add('active');
    
    // Update student count
    const count = localStorage.getItem(`studentCount_${section}`) || '50';
    document.getElementById('settingsStudentCount').textContent = `العدد الحالي: ${count}`;
    
    // Load student name list
    loadStudentNameList();
}

function loadStudentNameList() {
    const container = document.getElementById('studentNameList');
    const count = parseInt(localStorage.getItem(`studentCount_${settingsSection}`) || '50');
    
    let html = '';
    for (let i = 1; i <= count; i++) {
        const saved = localStorage.getItem(`quran_${settingsSection}-${i}`);
        let name = `طالب ${i}`;
        if (saved) {
            try {
                const d = JSON.parse(saved);
                if (d.name) name = d.name;
            } catch(e) {}
        }
        html += `
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                <span style="min-width: 30px; font-weight: bold;">${i}.</span>
                <input type="text" id="studentName-${i}" value="${name.replace(/"/g, '&quot;')}" style="flex: 1; padding: 10px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 14px; direction: rtl;">
                <button onclick="saveStudentName(${i})" style="background: #059669; color: white; padding: 10px 16px; border: none; border-radius: 12px; font-size: 14px; cursor: pointer;">💾</button>
            </div>
        `;
    }
    container.innerHTML = html;
}

function saveStudentName(num) {
    const input = document.getElementById(`studentName-${num}`);
    const newName = input.value.trim() || `طالب ${num}`;
    
    const saved = localStorage.getItem(`quran_${settingsSection}-${num}`);
    let data = {};
    if (saved) {
        try { data = JSON.parse(saved); } catch(e) {}
    }
    data.name = newName;
    
    localStorage.setItem(`quran_${settingsSection}-${num}`, JSON.stringify(data));
    markDataChanged();
    syncToCloud();
    showToast(`✅ تم حفظ اسم الطالب ${num}: ${newName}`);
}

function addStudentsFromSettings() {
    const count = parseInt(document.getElementById('addStudentCount').value) || 1;
    const currentCount = parseInt(localStorage.getItem(`studentCount_${settingsSection}`) || '50');
    const newCount = currentCount + count;
    
    localStorage.setItem(`studentCount_${settingsSection}`, newCount);
    markDataChanged();
    syncToCloud();
    
       showToast(`✅ تمت إضافة ${count} طلاب! العدد الآن: ${newCount}`);
    switchSettingsSection(settingsSection);
}

function deleteStudentsFromSettings() {
    const input = document.getElementById('deleteStudentNumbers').value.trim();
    if (!input) {
        alert('❌ الرجاء إدخال أرقام الطلاب');
        return;
    }
    
    const currentCount = parseInt(localStorage.getItem(`studentCount_${settingsSection}`) || '50');
    const numbers = [];
    const parts = input.split(/[,\s]+/);
    
    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                    if (i >= 1 && i <= currentCount) numbers.push(i);
                }
            }
        } else {
            const num = parseInt(part);
            if (!isNaN(num) && num >= 1 && num <= currentCount) numbers.push(num);
        }
    });
    
    if (numbers.length === 0) {
        alert('❌ لم يتم إدخال أرقام صحيحة');
        return;
    }
    
    const uniqueNumbers = [...new Set(numbers)].sort((a, b) => a - b);
    
    if (!confirm(`حذف ${uniqueNumbers.length} طالب؟`)) return;
    
    // Re-number remaining students
    const allData = [];
    for (let i = 1; i <= currentCount; i++) {
        const saved = localStorage.getItem(`quran_${settingsSection}-${i}`);
        if (saved) {
            allData.push({ index: i, data: saved });
        } else {
            allData.push({ 
                index: i, 
                data: JSON.stringify({ name: `طالب ${i}`, attendance: 'حاضر', hasQuran: false, hasUniform: false, points: 0 }) 
            });
        }
    }
    
    const remaining = allData.filter(item => !uniqueNumbers.includes(item.index));
    
    for (let i = 1; i <= currentCount; i++) {
        localStorage.removeItem(`quran_${settingsSection}-${i}`);
    }
    
    remaining.forEach((item, idx) => {
        const parsed = JSON.parse(item.data);
        parsed.name = parsed.name || `طالب ${idx + 1}`;
        localStorage.setItem(`quran_${settingsSection}-${idx + 1}`, JSON.stringify(parsed));
    });
    
    localStorage.setItem(`studentCount_${settingsSection}`, remaining.length);
    markDataChanged();
    syncToCloud();
    
    showToast(`✅ تم حذف ${uniqueNumbers.length} طالب`);
    switchSettingsSection(settingsSection);
}

function deleteHistoryWithPassword() {
    const p = prompt("🔐 أدخل كلمة المرور لحذف سجل التغييرات:");
    if (p !== ADMIN_PASSWORD) {
        alert("❌ كلمة مرور غير صحيحة");
        return;
    }
    if (!confirm("⚠️ هل أنت متأكد من حذف جميع سجلات التغييرات؟")) return;
    if (prompt("اكتب: حذف السجل") !== "حذف السجل") {
        alert("تم الإلغاء");
        return;
    }
    
    localStorage.removeItem('pendingHistoryLogs');
    allHistoryLogs = [];
    deleteAllHistoryFromCloud();
    showToast("✅ تم حذف جميع سجلات التغييرات");
}

function resetDataWithPassword() {
    const p = prompt("🔐 أدخل كلمة المرور لحذف جميع البيانات:");
    if (p !== ADMIN_PASSWORD) {
        alert("❌ كلمة مرور غير صحيحة");
        return;
    }
    resetAllData();
}

// Update admin visibility to show settings
const origUpdateAdminVisibility = updateAdminVisibility;
updateAdminVisibility = function() {
    origUpdateAdminVisibility();
    const settingsItem = document.getElementById('sidebar-settings');
    const settingsDivider = settingsItem?.nextElementSibling;
    if (settingsItem) {
        if (isAdmin()) {
            settingsItem.classList.remove('hidden');
            if (settingsDivider?.classList.contains('admin-only')) settingsDivider.classList.remove('hidden');
        } else {
            settingsItem.classList.add('hidden');
            if (settingsDivider?.classList.contains('admin-only')) settingsDivider.classList.add('hidden');
        }
    }
};
// ============================================================
// ADMIN PANEL
// ============================================================
function showAdminPanel() { 
    const p = prompt("🔐 كلمة المرور:"); 
    if (p !== ADMIN_PASSWORD) { alert("❌ كلمة مرور غير صحيحة"); return; } 
    const s = prompt("اختر:\n1- ثانوي\n2- متوسط\n3- ابتدائي\n4- حذف كل البيانات\n5- حذف سجل التغييرات"); 
    if (s === '4') { resetAllData(); return; }
    if (s === '5') { deleteHistoryData(); return; }
    let sec; 
    if (s === '1') sec = 'highschool'; 
    else if (s === '2') sec = 'middleschool'; 
    else if (s === '3') sec = 'elementary'; 
    else return; 
    const a = prompt("1- إضافة طلاب\n2- حذف طلاب"); 
    if (a === '1') addMultipleStudents(sec); 
    else if (a === '2') deleteMultipleStudents(sec); 
}
function addMultipleStudents(sec) { 
    const currentCount = parseInt(localStorage.getItem(`studentCount_${sec}`) || '50');
    const addCount = parseInt(prompt(`العدد الحالي: ${currentCount}\nكم طالب تريد إضافته؟`));
    
    if (isNaN(addCount) || addCount < 1) {
        alert("❌ رقم غير صحيح");
        return;
    }
    
    const newCount = currentCount + addCount;
    localStorage.setItem(`studentCount_${sec}`, newCount);
    
    if (sec === currentSection) { 
        totalStudents = newCount; 
        updateStudentDropdown(); 
    } 
    
    markDataChanged();
    syncToCloud();
       showToast(`✅ تمت إضافة ${addCount} طلاب! العدد الآن: ${newCount}`);
}

function deleteMultipleStudents(sec) { 
    const currentCount = parseInt(localStorage.getItem(`studentCount_${sec}`) || '50');
    const input = prompt(`العدد الحالي: ${currentCount}\nأدخل أرقام الطلاب المراد حذفهم:\n(مثال: 12,14,32,50 أو 30-45)`);
    
    if (!input) return;
    
    // Parse numbers and ranges
    const numbers = [];
    const parts = input.split(/[,\s]+/);
    
    parts.forEach(part => {
        if (part.includes('-')) {
            // Handle range like "30-45"
            const [start, end] = part.split('-').map(n => parseInt(n));
            if (!isNaN(start) && !isNaN(end)) {
                const from = Math.min(start, end);
                const to = Math.max(start, end);
                for (let i = from; i <= to; i++) {
                    if (i >= 1 && i <= currentCount) {
                        numbers.push(i);
                    }
                }
            }
        } else {
            // Handle single number
            const num = parseInt(part);
            if (!isNaN(num) && num >= 1 && num <= currentCount) {
                numbers.push(num);
            }
        }
    });
    
    if (numbers.length === 0) {
        alert("❌ لم يتم إدخال أرقام صحيحة");
        return;
    }
    
    const uniqueNumbers = [...new Set(numbers)].sort((a, b) => a - b);
    
    if (!confirm(`حذف ${uniqueNumbers.length} طالب:\nالأرقام: ${uniqueNumbers.slice(0, 20).join(', ')}${uniqueNumbers.length > 20 ? '...' : ''}\nمن ${SECTION_NAMES[sec]}؟`)) return;
    
    // ✅ Collect ALL students with their data (or default empty data)
    const allStudentsData = [];
    for (let i = 1; i <= currentCount; i++) {
        const saved = localStorage.getItem(`quran_${sec}-${i}`);
        if (saved) {
            allStudentsData.push({ index: i, data: saved });
        } else {
            allStudentsData.push({ 
                index: i, 
                data: JSON.stringify({ name: `طالب ${i}`, attendance: 'حاضر', hasQuran: false, hasUniform: false, points: 0 }) 
            });
        }
    }
    
    // Filter out deleted students
    const remainingStudents = allStudentsData.filter(item => !uniqueNumbers.includes(item.index));
    
    // Clear ALL existing student data for this section
    for (let i = 1; i <= currentCount; i++) {
        localStorage.removeItem(`quran_${sec}-${i}`);
    }
    
    // Rewrite remaining students sequentially starting from 1
    const newCount = remainingStudents.length;
    remainingStudents.forEach((item, idx) => {
        const newIndex = idx + 1;
        const parsed = JSON.parse(item.data);
        parsed.name = parsed.name || `طالب ${newIndex}`;
        localStorage.setItem(`quran_${sec}-${newIndex}`, JSON.stringify(parsed));
    });
    
    localStorage.setItem(`studentCount_${sec}`, newCount);
    
    if (sec === currentSection) { 
        totalStudents = newCount; 
        if (currentStudentIndex >= newCount) currentStudentIndex = Math.max(0, newCount - 1); 
        loadStudent(currentStudentIndex + 1); 
        updateStudentDropdown(); 
    }
    
    markDataChanged();
    syncToCloud();
    showToast(`✅ تم حذف ${uniqueNumbers.length} طالب بنجاح! العدد الآن: ${newCount}`);
}

function deleteHistoryData() {
    if (!confirm("⚠️ هل أنت متأكد من حذف جميع سجلات التغييرات؟\n\nلا يمكن التراجع عن هذا الإجراء!")) return;
    if (prompt("اكتب: حذف السجل") !== "حذف السجل") {
        alert("تم الإلغاء");
        return;
    }
    
    // Clear local history
    localStorage.removeItem('pendingHistoryLogs');
    allHistoryLogs = [];
    
    // Delete from cloud
    deleteAllHistoryFromCloud();
    
    // Refresh history tab if open
    if (currentSection === 'history') {
        document.getElementById('historyTableBody').innerHTML = 
            '<tr><td colspan="5" style="text-align:center;">✅ تم حذف جميع السجلات</td></tr>';
    }
    
    showToast("✅ تم حذف جميع سجلات التغييرات بنجاح!");
}
async function deleteAllHistoryFromCloud() {
    try {
        // First, get all history record IDs
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/history_log?select=id`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        const records = await response.json();
        
        if (records && records.length > 0) {
            // Delete each record individually
            for (const record of records) {
                await fetch(
                    `${SUPABASE_URL}/rest/v1/history_log?id=eq.${record.id}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`
                        }
                    }
                );
            }
            console.log(`✅ Deleted ${records.length} history records from cloud`);
        } else {
            console.log('✅ No history records to delete');
        }
    } catch (e) {
        console.error('Error deleting history:', e);
    }
}
function resetAllData() { 
    if (!confirm("⚠️ تحذير: سيتم حذف جميع البيانات نهائياً!\n\nهل أنت متأكد؟")) return;
    if (prompt("اكتب: حذف جميع البيانات") !== "حذف جميع البيانات") { 
        alert("تم الإلغاء"); 
        return; 
    }
    
    // Clear all Quran data from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) { 
        const k = localStorage.key(i); 
        if (k.startsWith('quran_')) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    // ✅ Clear pending history logs from localStorage
    localStorage.removeItem('pendingHistoryLogs');
    
    // Reset student counts
    localStorage.setItem('studentCount_highschool', '50'); 
    localStorage.setItem('studentCount_middleschool', '50'); 
    localStorage.setItem('studentCount_elementary', '50');
    
    markDataChanged();
    syncToCloud();
    
    // ✅ Delete all history from Supabase
    deleteAllHistoryFromCloud();
    
    setTimeout(() => {
              showToast("✅ تم حذف جميع البيانات! جاري تحديث الصفحة...");
        location.reload();
    }, 1000);
}// ============================================================
// REAL-TIME SUBSCRIPTION
// ============================================================
async function subscribeToRealtimeChanges() {
    if (!SUPABASE_ENABLED || !supabaseClient) {
        console.log('⚠️ Realtime sync disabled - Supabase not loaded');
        return;
    }
    
    if (realtimeChannel) {
        await realtimeChannel.unsubscribe();
    }
    
    realtimeChannel = supabaseClient
        .channel('quran-tracker-changes')
        .on(
            'postgres_changes',
            {
                event: '*',  // Listen to ALL events (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: SUPABASE_TABLE
            },
            (payload) => {
                // Ignore changes made by this device
                if (isOwnChange) {
                    console.log('⏭️ Ignoring own change');
                    return;
                }
                
                console.log('🔄 Change detected from another device!');
                
                // Check if tab is active
                if (document.hidden) {
                    console.log('💤 Tab inactive - will reload when active');
                    // Set flag to reload when tab becomes active
                    window.needsReload = true;
                } else {
                    // Reload data without full page refresh
                    refreshDataFromCloud();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Connected to real-time sync');
            }
        });
}

// New function: Refresh data without full page reload
async function refreshDataFromCloud() {
    console.log('🔄 Refreshing data from cloud...');
    
    await loadFromCloud();
    
    // Refresh current view based on active section
    if (currentSection === 'reports') {
        loadReportsData();
        loadDailyReport();
        loadPointsReport();
    } else if (currentSection === 'points') {
        initPointsTab();
    } else if (currentSection !== 'history') {
        // Reload current student
        loadStudent(currentStudentIndex + 1);
        updateStudentDropdown();
    }
    
    console.log('✅ Data refreshed from cloud');
}

// Add visibility change handler to reload when tab becomes active
document.addEventListener('visibilitychange', function() {
    isTabActive = !document.hidden;
    console.log(isTabActive ? '👁️ Tab active' : '💤 Tab inactive');
    
    // If tab becomes active and needs reload
    if (isTabActive && window.needsReload) {
        window.needsReload = false;
        console.log('🔄 Reloading after tab became active');
        refreshDataFromCloud();
    }
});
// ============================================================
// HISTORY LOGGING
// ============================================================
const HISTORY_ENABLED = true;

function logTeacherAction(studentName, actionType, details) {
    if (!HISTORY_ENABLED) return;
    
    const session = JSON.parse(sessionStorage.getItem('quranTrackerSession') || '{}');
    const teacherName = session.displayName || 'غير معروف';
    
    const logEntry = {
        id: Date.now() + Math.random().toString(36),
        teacherName: teacherName,
        studentName: studentName,
        section: SECTION_NAMES[currentSection] || currentSection,
        actionType: actionType,
        details: details,
        timestamp: new Date().toISOString()
    };
    
    // Store locally
    const pendingLogs = JSON.parse(localStorage.getItem('pendingHistoryLogs') || '[]');
    pendingLogs.push(logEntry);
    localStorage.setItem('pendingHistoryLogs', JSON.stringify(pendingLogs));
    
    console.log('📝 History logged:', teacherName, actionType, studentName);
}

function getActionSummary(data) {
    const parts = [];
    
    // Hifz details - NO page count
    if (data.hifz) {
        parts.push(`حفظ: ${data.hifz.startSurahName} ${data.hifz.startVerse} → ${data.hifz.endSurahName} ${data.hifz.endVerse}`);
    }
    
    // Rabt details
    if (data.rabt && data.rabt.length > 0) {
        const rabtDetails = data.rabt.map(r => 
            `${r.startSurahName} ${r.startVerse} → ${r.endSurahName} ${r.endVerse}`
        ).join(' | ');
        parts.push(`ربط: ${rabtDetails}`);
    }
    
    // Murajaa details - NO page count
    if (data.murajaa) {
        parts.push(`مراجعة: ${data.murajaa.startSurahName} ${data.murajaa.startVerse} → ${data.murajaa.endSurahName} ${data.murajaa.endVerse}`);
    }
    
    // Attendance
    parts.push(`حضور: ${data.attendance}`);
    
    // Quran/Mushaf
    parts.push(`مصحف: ${data.hasQuran ? '✅' : '❌'}`);
    
    // Uniform
    parts.push(`زي: ${data.hasUniform ? '✅' : '❌'}`);
    
    // Points
    if (data.points > 0) parts.push(`نقاط: ${data.points}`);
    
    return parts.join(' | ') || 'تحديث البيانات';
}

// ============================================================
// HISTORY TAB FUNCTIONS
// ============================================================
let allHistoryLogs = [];

async function loadHistoryTab() {
    if (!isAdmin()) {
        alert('❌ غير مصرح لك بالدخول');
        switchSection('highschool');
        return;
    }
    
    document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center;">⏳ جاري التحميل...</td></tr>';
    
    // Load from cloud
    await loadHistoryFromCloud();
    
    // Also load pending local logs
    const pendingLogs = JSON.parse(localStorage.getItem('pendingHistoryLogs') || '[]');
    allHistoryLogs = [...allHistoryLogs, ...pendingLogs];
    
    // Sort by date (newest first)
    allHistoryLogs.sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));
    
    filterHistory();
}

function filterHistory() {
    const teacherFilter = document.getElementById('historyTeacherFilter')?.value || 'all';
    const sectionFilter = document.getElementById('historySectionFilter')?.value || 'all';
    const dateFilter = document.getElementById('historyDateFilter')?.value;
    
    let filtered = allHistoryLogs;
    
    // Filter by teacher
    if (teacherFilter !== 'all') {
        filtered = filtered.filter(log => log.teacherName === teacherFilter || log.teacher_name === teacherFilter);
    }
    
    // Filter by section
    if (sectionFilter !== 'all') {
        filtered = filtered.filter(log => log.section === sectionFilter);
    }
    
    // Filter by date
    if (dateFilter) {
        filtered = filtered.filter(log => {
            const logDate = (log.timestamp || log.created_at).split('T')[0];
            return logDate === dateFilter;
        });
    }
    
    displayFilteredHistory(filtered);
}

function displayFilteredHistory(filtered) {
    const tbody = document.getElementById('historyTableBody');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد سجلات</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(log => {
        const date = new Date(log.timestamp || log.created_at).toLocaleString('ar-SA');
        const teacher = log.teacherName || log.teacher_name || '-';
        const student = log.studentName || log.student_name || '-';
        const section = log.section || '-';
        const details = log.details || '-';
        
        return `
            <tr>
                <td>${date}</td>
                <td>${teacher}</td>
                <td>${student}</td>
                <td>${section}</td>
                <td>${details}</td>
            </tr>
        `;
    }).join('');
}

async function syncHistoryToCloud() {
    const pendingLogs = JSON.parse(localStorage.getItem('pendingHistoryLogs') || '[]');
    
    if (pendingLogs.length === 0) {
        alert('لا توجد سجلات جديدة للمزامنة');
        return;
    }
    
    if (!confirm(`سيتم مزامنة ${pendingLogs.length} سجل. هل تريد المتابعة؟`)) return;
    
    try {
        for (const log of pendingLogs) {
            await fetch(`${SUPABASE_URL}/rest/v1/history_log`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    teacher_name: log.teacherName,
                    student_name: log.studentName,
                    section: log.section,
                    action_type: log.actionType,
                    details: log.details,
                    created_at: log.timestamp
                })
            });
        }
        
        localStorage.removeItem('pendingHistoryLogs');
        showToast(`✅ تم مزامنة ${pendingLogs.length} سجل بنجاح`);
        
        // Reload history tab
        if (currentSection === 'history') {
            loadHistoryTab();
        }
    } catch (e) {
        console.error('History sync error:', e);
        alert('❌ فشلت المزامنة. حاول مرة أخرى.');
    }
}

async function loadHistoryFromCloud() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/history_log?order=created_at.desc&limit=500`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        const data = await response.json();
        allHistoryLogs = data || [];
        return data;
    } catch (e) {
        console.error('Load history error:', e);
        allHistoryLogs = [];
        return [];
    }
}



// ============================================================
// STUDENT REPORTS FUNCTIONS
// ============================================================

let currentStudentReportSection = 'highschool';
let currentStudentReportMonth = new Date();
let currentSelectedStudent = null;

function initStudentReportsTab() {
    updateStudentReportMonthDisplay();
    switchStudentReportSection('highschool');
}

function switchStudentReportSection(section) {
    currentStudentReportSection = section;
    
    // Update active tab
    document.querySelectorAll('.student-report-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`sr-${section}`)?.classList.add('active');
    
    // Load students for this section
    loadStudentReportDropdown();
    
    // Reset content
    currentSelectedStudent = null;
    document.getElementById('studentReportContent')?.classList.add('hidden');
}

function loadStudentReportDropdown() {
    const select = document.getElementById('studentReportSelect');
    if (!select) return;
    
    const count = parseInt(localStorage.getItem(`studentCount_${currentStudentReportSection}`) || '50');
    
    let html = '<option value="">-- اختر طالب --</option>';
    
    for (let i = 1; i <= count; i++) {
        const saved = localStorage.getItem(`quran_${currentStudentReportSection}-${i}`);
        let name = `طالب ${i}`;
        if (saved) {
            try {
                const d = JSON.parse(saved);
                if (d.name) name = d.name;
            } catch(e) {}
        }
        html += `<option value="${i}">${i} - ${name}</option>`;
    }
    
    select.innerHTML = html;
}

function changeStudentReportMonth(delta) {
    currentStudentReportMonth.setMonth(currentStudentReportMonth.getMonth() + delta);
    updateStudentReportMonthDisplay();
    if (currentSelectedStudent) {
        loadStudentReport();
    }
}

function updateStudentReportMonthDisplay() {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const display = document.getElementById('studentReportMonthDisplay');
    if (display) {
        display.textContent = `${months[currentStudentReportMonth.getMonth()]} ${currentStudentReportMonth.getFullYear()}`;
    }
}

function loadStudentReport() {
    const select = document.getElementById('studentReportSelect');
    if (!select || !select.value) {
        document.getElementById('studentReportContent')?.classList.add('hidden');
        return;
    }
    
    currentSelectedStudent = select.value;
    const studentNum = parseInt(select.value);
    
    // Get student name
    const saved = localStorage.getItem(`quran_${currentStudentReportSection}-${studentNum}`);
    let studentName = `طالب ${studentNum}`;
    if (saved) {
        try {
            const d = JSON.parse(saved);
            if (d.name) studentName = d.name;
        } catch(e) {}
    }
    
    // Update title
    const sectionNames = { highschool: 'ثانوي', middleschool: 'متوسط', elementary: 'ابتدائي' };
    document.getElementById('studentReportTitle').textContent = 
        `📄 تقرير: ${studentName} - ${sectionNames[currentStudentReportSection]} | ${document.getElementById('studentReportMonthDisplay').textContent}`;
    
    // Get all records for this student in the selected month
    const year = currentStudentReportMonth.getFullYear();
    const month = currentStudentReportMonth.getMonth();
    
    const records = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get all data for this student
    const studentData = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key === `quran_${currentStudentReportSection}-${studentNum}`) {
            try {
                const d = JSON.parse(localStorage.getItem(key));
                if (d.savedAt) {
                    const savedDate = new Date(d.savedAt);
                    if (savedDate.getFullYear() === year && savedDate.getMonth() === month) {
                        studentData.push({
                            day: savedDate.getDate(),
                            data: d
                        });
                    }
                }
            } catch(e) {}
        }
    }
    
   for (let day = 1; day <= daysInMonth; day++) {
    // Create date object for this day
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    // ONLY include Sunday (0) through Thursday (4)
    // Skip Friday (5) and Saturday (6)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
        continue; // Skip Friday and Saturday
    }
    
  
       
    const found = studentData.find(d => d.day === day);
    
    if (found) {
        const d = found.data;
        records.push({
            date: day,
            attendance: d.attendance || '-',
            points: d.points || 0,
            hifz: d.hifz ? `${d.hifz.startSurahName || ''} ${d.hifz.startVerse}-${d.hifz.endVerse}` : '-',
            rabt: d.rabt?.length ? d.rabt.map(r => `${r.startSurahName || ''} ${r.startVerse}-${r.endVerse}`).join('، ') : '-',
            murajaa: d.murajaa ? `${d.murajaa.startSurahName || ''} ${d.murajaa.startVerse}-${d.murajaa.endVerse}` : '-',
            hifzPages: d.hifz?.pages || 0,
            rabtPages: d.rabt?.reduce((sum, r) => sum + (r.pages || 0), 0) || 0,
            murajaaPages: d.murajaa?.pages || 0
        });
    } else {
        records.push({
            date: day,
            attendance: '-',
            points: 0,
            hifz: '-',
            rabt: '-',
            murajaa: '-',
            hifzPages: 0,
            rabtPages: 0,
            murajaaPages: 0
        });
    }
}    
    // Render table
    let tableHtml = '';
    let totalPoints = 0;
    let presentDays = 0;
    let lateDays = 0;
    let totalHifzPages = 0;
    let totalRabtPages = 0;
    let totalMurajaaPages = 0;
    
    records.forEach(r => {
        const attendanceIcon = {'حاضر':'✅', 'متأخر':'🕐', 'غائب':'❌', 'معذور':'⚠️'}[r.attendance] || '➖';
        
        tableHtml += `<tr>
            <td>${r.date}/${month+1}</td>
            <td>${attendanceIcon}</td>
            <td>${Number(r.points).toFixed(1).replace(/\.0$/, '')}</td>
            <td>${r.hifz}</td>
            <td>${r.rabt}</td>
            <td>${r.murajaa}</td>
        </tr>`;
        
        totalPoints += r.points;
        if (r.attendance === 'حاضر') presentDays++;
        if (r.attendance === 'متأخر') lateDays++;
        totalHifzPages += r.hifzPages;
        totalRabtPages += r.rabtPages;
        totalMurajaaPages += r.murajaaPages;
    });
    
    document.getElementById('studentReportTableBody').innerHTML = tableHtml;
    
    // Update stats
    const attendedDays = presentDays + lateDays;
    document.getElementById('studentReportStats').innerHTML = `
        <div>⭐ إجمالي النقاط<br><strong>${Number(totalPoints).toFixed(1).replace(/\.0$/, '')}</strong></div>
        <div>📅 أيام الحضور<br><strong>${attendedDays}/${records.length}</strong></div>
        <div>📖 صفحات الحفظ<br><strong>${totalHifzPages}</strong></div>
        <div>🔗 صفحات الربط<br><strong>${totalRabtPages}</strong></div>
        <div>📚 صفحات المراجعة<br><strong>${totalMurajaaPages}</strong></div>
        <div>📄 إجمالي الصفحات<br><strong>${totalHifzPages + totalRabtPages + totalMurajaaPages}</strong></div>
    `;
    
    // Show content
    document.getElementById('studentReportContent')?.classList.remove('hidden');
}

// ============================================================
// POINTS MANAGEMENT TAB
// ============================================================
let currentPMSection = 'highschool';
let currentPMOperation = 'add';
let currentPMPoints = 1;

function initPointsManagement() {
    currentPMSection = 'highschool';
    currentPMOperation = 'add';
    currentPMPoints = 1;
    
    // Reset UI - tab highlighting
    setTimeout(() => {
        document.querySelectorAll('#pointsManagementView .student-report-tab').forEach(t => t.classList.remove('active'));
        const pmTab = document.getElementById('pm-highschool');
        if (pmTab) pmTab.classList.add('active');
    }, 50);
    
    // Reset buttons
    setTimeout(() => {
        const addBtn = document.getElementById('pmAddBtn');
        const removeBtn = document.getElementById('pmRemoveBtn');
        if (addBtn) { addBtn.style.background = '#059669'; addBtn.style.color = 'white'; }
        if (removeBtn) { removeBtn.style.background = '#f3f4f6'; removeBtn.style.color = '#4b5563'; }
    }, 50);
    
    // Reset inputs
    setTimeout(() => {
        const pointsInput = document.getElementById('pmPointsInput');
        const reasonInput = document.getElementById('pmReason');
        const currentPoints = document.getElementById('pmCurrentPointsValue');
        if (pointsInput) pointsInput.value = 1;
        if (reasonInput) reasonInput.value = '';
        if (currentPoints) currentPoints.textContent = '0';
    }, 50);
    
    // Reset preset buttons
    setTimeout(() => {
        document.querySelectorAll('.pm-point-btn').forEach(btn => {
            btn.style.background = '#f0fdf4';
            btn.style.color = '#059669';
        });
    }, 50);
    
    // Load students with extra delay
    setTimeout(() => {
        loadPMStudentDropdown();
    }, 600);
}
function switchPMSection(section) {
    currentPMSection = section;
    document.querySelectorAll('#pointsManagementView .student-report-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`pm-${section}`)?.classList.add('active');
    loadPMStudentDropdown();
    document.getElementById('pmCurrentPointsValue').textContent = '0';
    document.getElementById('pmStudentSelect').value = '';
    document.getElementById('pmReason').value = '';
}

function loadPMStudentDropdown() {
    const select = document.getElementById('pmStudentSelect');
    if (!select) return;
    
    const count = parseInt(localStorage.getItem(`studentCount_${currentPMSection}`) || '50');
    let html = '<option value="">-- اختر طالب --</option>';
    
    for (let i = 1; i <= count; i++) {
        const key = `quran_${currentPMSection}-${i}`;
        const saved = localStorage.getItem(key);
        let name = `طالب ${i}`;
        let points = 0;
        if (saved) {
            try {
                const d = JSON.parse(saved);
                if (d.name) name = d.name;
                points = parseInt(d.points) || 0;
            } catch(e) {}
        }
        html += `<option value="${i}" data-points="${points}">${i} - ${name} (${points} ⭐)</option>`;
    }
    
    select.innerHTML = html;
    
    select.onchange = function() {
        const selectedOption = this.options[this.selectedIndex];
        const points = selectedOption.getAttribute('data-points') || '0';
        document.getElementById('pmCurrentPointsValue').textContent = points;
    };
}

function setPMOperation(type) {
    currentPMOperation = type;
    const addBtn = document.getElementById('pmAddBtn');
    const removeBtn = document.getElementById('pmRemoveBtn');
    
    if (type === 'add') {
        addBtn.style.background = '#059669';
        addBtn.style.color = 'white';
        removeBtn.style.background = '#f3f4f6';
        removeBtn.style.color = '#4b5563';
    } else {
        removeBtn.style.background = '#ef4444';
        removeBtn.style.color = 'white';
        addBtn.style.background = '#f3f4f6';
        addBtn.style.color = '#4b5563';
    }
}

function setPMPoints(points) {
    currentPMPoints = points;
    document.getElementById('pmPointsInput').value = points;
    document.querySelectorAll('.pm-point-btn').forEach(btn => {
        const btnPoints = parseInt(btn.textContent);
        if (btnPoints === points) {
            btn.style.background = '#059669';
            btn.style.color = 'white';
        } else {
            btn.style.background = '#f0fdf4';
            btn.style.color = '#059669';
        }
    });
}

function savePMOperation() {
       if (!isHalaqaActive()) {
        showToast('⏸️ الحلقة متوقفة - لا يمكن إضافة نقاط');
        return;
    }
    const studentSelect = document.getElementById('pmStudentSelect');
    const reasonInput = document.getElementById('pmReason');
    
    if (!studentSelect.value) {
        showToast('⚠️ الرجاء اختيار طالب أولاً');
        return;
    }
    
  
    
    const points = parseInt(document.getElementById('pmPointsInput').value) || currentPMPoints;
    if (points <= 0) {
        showToast('⚠️ الرجاء إدخال عدد نقاط صحيح');
        return;
    }
    
    const studentNum = parseInt(studentSelect.value);
    const key = `quran_${currentPMSection}-${studentNum}`;
    
    let studentData = { name: `طالب ${studentNum}`, attendance: 'حاضر', hasQuran: false, hasUniform: false, points: 0 };
    const saved = localStorage.getItem(key);
    if (saved) {
        try { studentData = JSON.parse(saved); } catch(e) {}
    }
    
    const oldPoints = parseInt(studentData.points) || 0;
    let newPoints;
    if (currentPMOperation === 'add') {
        newPoints = oldPoints + points;
    } else {
        newPoints = oldPoints - points;
    }
    
    studentData.points = newPoints;
    studentData.pointsUpdatedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(studentData));
    
    const sectionNames = { highschool: 'ثانوي', middleschool: 'متوسط', elementary: 'ابتدائي' };
    const operationSymbol = currentPMOperation === 'add' ? '➕' : '➖';
    const operationText = currentPMOperation === 'add' ? 'إضافة' : 'خصم';
    
        logTeacherAction(
        studentData.name,
        'إدارة النقاط',
        `${operationSymbol} ${operationText} ${points} نقطة | ${oldPoints} → ${newPoints} | ${sectionNames[currentPMSection]}`
    );
    
    markDataChanged();
    syncToCloud();
    
    showToast(`✅ تم ${operationText} ${points} نقطة ${currentPMOperation === 'add' ? 'لـ' : 'من'} ${studentData.name}`);
    
    document.getElementById('pmCurrentPointsValue').textContent = newPoints;
    document.getElementById('pmReason').value = '';
    document.getElementById('pmPointsInput').value = 1;
    currentPMPoints = 1;
    
    document.querySelectorAll('.pm-point-btn').forEach(btn => {
        btn.style.background = '#f0fdf4';
        btn.style.color = '#059669';
    });
    
    loadPMStudentDropdown();
    setTimeout(() => {
        document.getElementById('pmStudentSelect').value = studentNum;
        document.getElementById('pmCurrentPointsValue').textContent = newPoints;
    }, 100);
    
    const saveBtn = event.target;
    if (saveBtn) {
        saveBtn.textContent = '✅ تم الحفظ!';
        saveBtn.style.background = '#047857';
        setTimeout(() => {
            saveBtn.textContent = '💾 حفظ';
            saveBtn.style.background = '#059669';
        }, 1500);
    }
}
// Listen for manual points input in Points Management
document.addEventListener('DOMContentLoaded', function() {
    const pmPointsInput = document.getElementById('pmPointsInput');
    if (pmPointsInput) {
        pmPointsInput.addEventListener('input', function() {
            currentPMPoints = parseInt(this.value) || 1;
            document.querySelectorAll('.pm-point-btn').forEach(btn => {
                btn.style.background = '#f0fdf4';
                btn.style.color = '#059669';
            });
        });
    }
});
// ============================================================
// HALAQA START/PAUSE/CONTINUE
// ============================================================

function getHalaqaState() {
    return localStorage.getItem('quran_halaqa_state') || 'not_started';
}

function isHalaqaActive() {
    const state = getHalaqaState();
    return state === 'running'; // Only 'running' = active
}

function startHalaqa() {
    localStorage.setItem('quran_halaqa_state', 'running');
    markDataChanged();
    syncToCloud();
    updateHalaqaButtons();
    showToast('🟢 تم بدء الحلقة');
    if (currentSection === 'reports') loadDailyReport();
}

function pauseHalaqa() {
    if (!confirm('⚠️ إيقاف الحلقة؟\nلن يتمكن المعلمون من الحفظ.')) return;
    localStorage.setItem('quran_halaqa_state', 'paused');
    markDataChanged();
    syncToCloud();
    updateHalaqaButtons();
    showToast('⏸️ تم إيقاف الحلقة');
    if (currentSection === 'reports') loadDailyReport();
}

function continueHalaqa() {
    localStorage.setItem('quran_halaqa_state', 'running');
    markDataChanged();
    syncToCloud();
    updateHalaqaButtons();
    showToast('▶️ تم متابعة الحلقة');
    if (currentSection === 'reports') loadDailyReport();
}

function updateHalaqaButtons() {
    const startBtn = document.getElementById('halaqaStartBtn');
    const pauseBtn = document.getElementById('halaqaPauseBtn');
    const continueBtn = document.getElementById('halaqaContinueBtn');
    const label = document.getElementById('halaqaStartLabel');
    const state = getHalaqaState();
    
    if (startBtn) startBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (continueBtn) continueBtn.style.display = 'none';
    
    if (state === 'not_started') {
        if (startBtn) startBtn.style.display = 'block';
        if (label) { label.textContent = '⚪ الحلقة لم تبدأ بعد'; label.style.color = '#6b7280'; }
    } else if (state === 'running') {
        if (pauseBtn) pauseBtn.style.display = 'block';
        if (label) { label.textContent = '🟢 الحلقة قائمة - التطبيق مفتوح'; label.style.color = '#059669'; }
    } else if (state === 'paused') {
        if (continueBtn) continueBtn.style.display = 'block';
        if (label) { label.textContent = '⏸️ الحلقة متوقفة - التطبيق مقفل'; label.style.color = '#f59e0b'; }
    }
    
    // Banner
    let banner = document.getElementById('halaqaBanner');
    if (state === 'paused') {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'halaqaBanner';
            banner.style.cssText = 'background:#fef3c7;color:#92400e;text-align:center;padding:12px;border-radius:12px;margin-bottom:12px;font-weight:700;font-size:16px;border:2px solid #f59e0b;';
            banner.textContent = '⏸️ الحلقة متوقفة مؤقتاً';
            document.querySelector('.date-bar')?.insertAdjacentElement('afterend', banner);
        }
    } else {
        if (banner) banner.remove();
    }
}

window.onload = () => {
    subscribeToRealtimeChanges();
    loadQuranData();
};

