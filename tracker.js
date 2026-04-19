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
    setTimeout(() => { isOwnChange = false; }, 500);  // ✅ ADD THIS LINE
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
    const session = sessionStorage.getItem('quranTrackerSession');
    if (!session) { window.location.href = 'login.html'; return false; }
    try {
        const data = JSON.parse(session);
        if (new Date(data.expiresAt) < new Date()) { 
            sessionStorage.removeItem('quranTrackerSession'); 
            window.location.href = 'login.html'; 
            return false; 
        }
        document.getElementById('loggedInUser').textContent = `مرحباً، ${data.displayName}`;
        return true;
    } catch (e) { 
        sessionStorage.removeItem('quranTrackerSession'); 
        window.location.href = 'login.html'; 
        return false; 
    }
}

function logout() { 
    if (confirm('تسجيل الخروج؟')) { 
        sessionStorage.removeItem('quranTrackerSession'); 
        window.location.href = 'login.html'; 
    } 
}
function markDataChanged() {
    hasUnsavedChanges = true;
    console.log('📝 Data changed - pending sync');
}



let surahsData = [];
let currentSection = 'highschool';
let currentStudentIndex = 0;
let totalStudents = 50;
let currentReportMonth = new Date();
let currentReportDate = new Date().toISOString().split('T')[0];
let currentAttendance = 'حاضر';

const SECTION_NAMES = { 
    highschool: 'ثانوي', 
    middleschool: 'متوسط', 
    elementary: 'ابتدائي' 
};
const ADMIN_PASSWORD = "224312";

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
function getPage(surah, verse) {
    const key = `${surah}:${verse}`;
    return VERSE_PAGE_MAPPING[key] || null;
}

function calculatePages(startSurah, startVerse, endSurah, endVerse) {
    const startPage = getPage(parseInt(startSurah), parseInt(startVerse));
    const endPage = getPage(parseInt(endSurah), parseInt(endVerse));
    
    if (startPage === null || endPage === null) {
        return 0;
    }
    
    return endPage - startPage + 1;
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
    
    try { 
        const r = await fetch('https://api.alquran.cloud/v1/surah'); 
        const data = await r.json(); 
        
        surahsData = data.data.map((surah, index) => ({
            number: surah.number,
            name: SURAH_NAMES_AR[index] || surah.name,
            englishName: surah.englishName,
            numberOfAyahs: surah.numberOfAyahs
        }));
        
        initApp(); 
    } catch (e) {
        surahsData = SURAH_NAMES_AR.map((name, index) => ({
            number: index + 1,
            name: name,
            englishName: name,
            numberOfAyahs: AYAH_COUNTS[index] || 10
        }));
        initApp();
    }
}

function initApp() {
    loadStudentCounts();
    updateStudentDropdown();
    loadStudent(currentStudentIndex + 1);
    
    // ✅ Initialize date displays for reports
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    document.getElementById('currentMonthDisplay').textContent = `${months[currentReportMonth.getMonth()]} ${currentReportMonth.getFullYear()}`;
    document.getElementById('currentDateDisplay').textContent = new Date(currentReportDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
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
            data = { ...data, ...parsed };
            if (!data.name || data.name === '') data.name = `طالب ${studentNum}`;
        } catch(e) {}
    }
    
    currentAttendance = data.attendance || 'حاضر';
    
    let surahOptions = '';
    if (surahsData && surahsData.length > 0) {
        surahOptions = surahsData.map(s => `<option value="${s.number}">${s.name}</option>`).join('');
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
                        <select id="hifzStartSurah" class="range-select" onchange="updateStartVerses('hifz')"><option value="">من سورة</option>${surahOptions}</select>
                        <select id="hifzStartVerse" class="verse-select"><option value="">من آية</option></select>
                    </div>
                    <div class="range-input"><span class="arrow">⬇</span></div>
                    <div class="range-input">
                        <select id="hifzEndSurah" class="range-select" onchange="updateEndVerses('hifz')"><option value="">إلى سورة</option>${surahOptions}</select>
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
                        <select id="murajaaStartSurah" class="range-select" onchange="updateStartVerses('murajaa')"><option value="">من سورة</option>${surahOptions}</select>
                        <select id="murajaaStartVerse" class="verse-select"><option value="">من آية</option></select>
                    </div>
                    <div class="range-input"><span class="arrow">⬇</span></div>
                    <div class="range-input">
                        <select id="murajaaEndSurah" class="range-select" onchange="updateEndVerses('murajaa')"><option value="">إلى سورة</option>${surahOptions}</select>
                        <select id="murajaaEndVerse" class="verse-select"><option value="">إلى آية</option></select>
                    </div>
                </div>
            </div>
            <div class="attendance-row">
                <button class="attendance-btn ${currentAttendance === 'حاضر' ? 'active' : ''}" onclick="setAttendance('حاضر')">✅ حاضر</button>
                <button class="attendance-btn ${currentAttendance === 'غائب' ? 'active' : ''}" onclick="setAttendance('غائب')">❌ غائب</button>
                <button class="attendance-btn ${currentAttendance === 'معذور' ? 'active' : ''}" onclick="setAttendance('معذور')">⚠️ معذور</button>
            </div>
            <div class="checks-row">
                <label class="check-item"><input type="checkbox" id="quranCheck" ${data.hasQuran ? 'checked' : ''}> 📚 مصحف</label>
                <label class="check-item"><input type="checkbox" id="uniformCheck" ${data.hasUniform ? 'checked' : ''}> 👕 زي</label>
            </div>
            <div class="points-row">
                <span class="points-label">⭐ نقاط</span>
                <input type="number" id="pointsInput" class="points-input" min="0" max="100" value="${data.points || 0}">
            </div>
            <button class="save-btn" onclick="saveCurrentStudent()">💾 حفظ</button>
        </div>
    `;
    
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
                    document.getElementById('hifzEndSurah').value = data.hifz.endSurah;
                    updateEndVerses('hifz');
                    setTimeout(() => document.getElementById('hifzEndVerse').value = data.hifz.endVerse, 30);
                }, 30);
            }
        }, 30);
    }
    
    if (data.murajaa) {
        setTimeout(() => {
            const startSurah = document.getElementById('murajaaStartSurah');
            if (startSurah) {
                startSurah.value = data.murajaa.startSurah;
                updateStartVerses('murajaa');
                setTimeout(() => {
                    document.getElementById('murajaaStartVerse').value = data.murajaa.startVerse;
                    document.getElementById('murajaaEndSurah').value = data.murajaa.endSurah;
                    updateEndVerses('murajaa');
                    setTimeout(() => document.getElementById('murajaaEndVerse').value = data.murajaa.endVerse, 30);
                }, 30);
            }
        }, 30);
    }
}

function addRabtItem(existing = null) {
    const container = document.getElementById('rabtContainer');
    const id = `rabt-${Date.now()}-${rabtCounter++}`;
    
    let surahOptions = '';
    if (surahsData && surahsData.length > 0) {
        surahOptions = surahsData.map(s => `<option value="${s.number}">${s.name}</option>`).join('');
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
            <select class="range-select rabt-start-surah" onchange="updateRabtStartVerses('${id}')"><option value="">من سورة</option>${surahOptions}</select>
            <select class="verse-select rabt-start-verse"><option value="">من آية</option></select>
        </div>
        <div class="range-input"><span class="arrow">⬇</span></div>
        <div class="range-input">
            <select class="range-select rabt-end-surah" onchange="updateRabtEndVerses('${id}')"><option value="">إلى سورة</option>${surahOptions}</select>
            <select class="verse-select rabt-end-verse"><option value="">إلى آية</option></select>
        </div>
    `;
    container.appendChild(div);
    
    if (existing) {
        setTimeout(() => {
            const item = document.getElementById(id);
            if (item) {
                item.querySelector('.rabt-start-surah').value = existing.startSurah;
                updateRabtStartVerses(id);
                setTimeout(() => {
                    item.querySelector('.rabt-start-verse').value = existing.startVerse;
                    item.querySelector('.rabt-end-surah').value = existing.endSurah;
                    updateRabtEndVerses(id);
                    setTimeout(() => item.querySelector('.rabt-end-verse').value = existing.endVerse, 30);
                }, 30);
            }
        }, 30);
    }
}

function updateVerseOptions(surahNum, selectEl, placeholder) {
    if (!surahNum) { 
        selectEl.innerHTML = `<option value="">${placeholder}</option>`; 
        return; 
    }
    const surah = surahsData.find(s => s.number == surahNum);
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
            startSurahName: surahsData.find(s => s.number == hs)?.name || '', 
            endSurahName: surahsData.find(s => s.number == he)?.name || '',
            pages: calculatePages(hs, hsv, he, hev)  // ✅ ADD THIS LINE
        };
    }
    
        const ms = document.getElementById('murajaaStartSurah')?.value;
    const msv = document.getElementById('murajaaStartVerse')?.value;
    const me = document.getElementById('murajaaEndSurah')?.value;
    const mev = document.getElementById('murajaaEndVerse')?.value;
    if (ms && msv && me && mev) {
        murajaa = { 
            startSurah: ms, startVerse: msv, endSurah: me, endVerse: mev, 
            startSurahName: surahsData.find(s => s.number == ms)?.name || '', 
            endSurahName: surahsData.find(s => s.number == me)?.name || '',
            pages: calculatePages(ms, msv, me, mev)  // ✅ ADD THIS LINE
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
                startSurahName: surahsData.find(s => s.number == ss)?.name || '', 
                endSurahName: surahsData.find(s => s.number == es)?.name || '',
                pages: calculatePages(ss, sv, es, ev)  // ✅ ADD THIS LINE
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
    
    const btn = event.target;
    if (btn) {
        btn.textContent = '✅ تم الحفظ!';
        setTimeout(() => btn.textContent = '💾 حفظ', 1500);
    }
}

// ============================================================
// NAVIGATION
// ============================================================
function switchSection(section) {
    currentSection = section;
    
    // Hide all sections
    document.querySelectorAll('.tracker-section').forEach(el => el.classList.add('hidden'));
    
    // Show selected section
    if (section === 'reports') {
        document.getElementById('reportsView').classList.remove('hidden');
        document.getElementById('trackerView').classList.add('hidden');
        document.getElementById('section-history')?.classList.add('hidden');
    } else if (section === 'history') {
        document.getElementById('section-history')?.classList.remove('hidden');
        document.getElementById('trackerView').classList.add('hidden');
        document.getElementById('reportsView').classList.add('hidden');
    } else {
        document.getElementById('trackerView').classList.remove('hidden');
        document.getElementById('reportsView').classList.add('hidden');
        document.getElementById('section-history')?.classList.add('hidden');
    }
    
    // Update tabs
    const sections = ['highschool', 'middleschool', 'elementary', 'reports', 'history'];
    document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', sections[i] === section);
    });
    
    // Show/hide history tab based on admin
    if (isAdmin()) {
        document.getElementById('tab-history')?.classList.remove('hidden');
    } else {
        document.getElementById('tab-history')?.classList.add('hidden');
    }
    
    if (section === 'history') {
        loadHistoryTab();
    } else if (section === 'reports') {
        loadReportsData();
        loadDailyReport();
        loadPointsReport();
    } else if (section !== 'history') {
        loadStudentCounts();
        currentStudentIndex = 0;
        updateStudentDropdown();
        loadStudent(1);
    }
}
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

function jumpToStudent() { 
    const select = document.getElementById('studentJumpSelect');
    if (select) {
        currentStudentIndex = parseInt(select.value) - 1; 
        loadStudent(currentStudentIndex + 1); 
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
    document.getElementById('currentDateDisplay').textContent = new Date(currentReportDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); 
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
    document.getElementById('currentDateDisplay').textContent = new Date(currentReportDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    ['highschool','middleschool','elementary'].forEach(s => {
        const c = document.getElementById(`daily-${s}`); 
        const st = [];
        for (let i = 0; i < localStorage.length; i++) { 
            const k = localStorage.key(i); 
            if (k.startsWith(`quran_${s}-`)) { 
                try { 
                    const d = JSON.parse(localStorage.getItem(k)); 
                    if (d?.savedAt && new Date(d.savedAt).toISOString().split('T')[0] === currentReportDate) st.push(d); 
                } catch (e) {} 
            } 
        }
        if (st.length === 0) { 
            c.innerHTML = '<div class="no-data">لا توجد بيانات لهذا اليوم</div>'; 
            return; 
        }
        
        let h = '<table class="summary-table"><tr><th>#</th><th>الطالب</th><th>الحضور</th><th>حفظ</th><th>ربط</th><th>مراجعة</th><th>مصحف</th><th>زي</th><th>نقاط</th></tr>';
        st.forEach((d, idx) => { 
            const hifzText = d.hifz ? `${d.hifz.startSurahName || ''} ${d.hifz.startVerse} ← ${d.hifz.endSurahName || ''} ${d.hifz.endVerse}` : '-';
            const rabtText = d.rabt?.length ? d.rabt.map(r => `${r.startSurahName || ''} ${r.startVerse} ← ${r.endSurahName || ''} ${r.endVerse}`).join('، ') : '-';
            const murajaaText = d.murajaa ? `${d.murajaa.startSurahName || ''} ${d.murajaa.startVerse} ← ${d.murajaa.endSurahName || ''} ${d.murajaa.endVerse}` : '-';
            h += `<tr><td>${idx+1}</td><td>${d.name || '-'}</td><td>${d.attendance || '-'}</td><td>${hifzText}</td><td>${rabtText}</td><td>${murajaaText}</td><td>${d.hasQuran ? '✅' : '❌'}</td><td>${d.hasUniform ? '✅' : '❌'}</td><td>${d.points || 0}</td></tr>`; 
        });
        c.innerHTML = h + '</table>';
    });
}

// ============================================================
// POINTS REPORT
// ============================================================
function loadPointsReport() {
    ['highschool', 'middleschool', 'elementary'].forEach(section => {
        const container = document.getElementById(`points-${section}`);
        if (!container) return;
        
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
// PDF EXPORT
// ============================================================
function exportDailyReport(l) { 
    const el = document.getElementById(`daily-${l}`); 
    if (!el || el.querySelector('.no-data')) { alert('لا توجد بيانات للتصدير'); return; } 
    const sectionName = SECTION_NAMES[l];
    const dateStr = new Date(currentReportDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير ${sectionName} اليومي</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:'Cairo',sans-serif;direction:rtl;padding:20px}h1{color:#065f46;text-align:center}.date-info{text-align:center;color:#047857;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#047857;color:white;padding:10px}td{padding:8px;border-bottom:1px solid #ddd;text-align:center}@media print{button{display:none}}.print-btn{background:#059669;color:white;padding:10px 30px;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:20px}</style></head><body><h1>📋 تقرير المرحلة ${sectionName} اليومي</h1><div class="date-info">📅 ${hDate} | 📆 ${gDate}</div>${el.innerHTML}<div style="text-align:center;margin-top:20px"><button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div></body></html>`);
    printWindow.document.close();
}

function exportMonthlyReport(l) { 
    const sectionName = SECTION_NAMES[l];
    const monthStr = currentReportMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    const summaryHTML = document.getElementById(`${l}-summary`).innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير ${sectionName} الشهري</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:'Cairo',sans-serif;direction:rtl;padding:20px}h1{color:#065f46;text-align:center}.date-info{text-align:center;color:#047857;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#047857;color:white;padding:10px}td{padding:8px;border-bottom:1px solid #ddd;text-align:center}@media print{button{display:none}}.print-btn{background:#059669;color:white;padding:10px 30px;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:20px}</style></head><body><h1>📊 تقرير المرحلة ${sectionName} الشهري</h1><div class="date-info">${monthStr}</div>${summaryHTML}<div style="text-align:center;margin-top:20px"><button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div></body></html>`);
    printWindow.document.close();
}

function exportGrandTotal() {
    const monthStr = currentReportMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
    const highHTML = document.getElementById('highschool-summary').innerHTML;
    const middleHTML = document.getElementById('middleschool-summary').innerHTML;
    const elemHTML = document.getElementById('elementary-summary').innerHTML;
    const total = document.getElementById('grand-total-khatmah').textContent;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>التقرير الشامل</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:'Cairo',sans-serif;direction:rtl;padding:20px}h1{color:#065f46;text-align:center}h2{color:#047857;margin-top:20px}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#047857;color:white;padding:10px}td{padding:8px;border-bottom:1px solid #ddd;text-align:center}.grand-total{background:#059669;color:white;padding:20px;border-radius:12px;text-align:center;margin-top:20px}@media print{button{display:none}}.print-btn{background:#059669;color:white;padding:10px 30px;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:20px}</style></head><body><h1>📊 التقرير الشامل لجميع المراحل</h1><p style="text-align:center">${monthStr}</p><h2>🏫 المرحلة الثانوية</h2>${highHTML}<h2>🏫 المرحلة المتوسطة</h2>${middleHTML}<h2>🏫 المرحلة الابتدائية</h2>${elemHTML}<div class="grand-total"><h2 style="color:white">🎯 إجمالي الختمات</h2><div style="font-size:40px">${total} ختمة</div></div><div style="text-align:center;margin-top:20px"><button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div></body></html>`);
    printWindow.document.close();
}

function exportPointsReport(level) {
    const sectionName = SECTION_NAMES[level];
    const container = document.getElementById(`points-${level}`);
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير نقاط ${sectionName}</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:'Cairo',sans-serif;direction:rtl;padding:20px}h1{color:#065f46;text-align:center}.date-info{text-align:center;color:#047857;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#047857;color:white;padding:10px}td{padding:8px;border-bottom:1px solid #ddd;text-align:center}@media print{button{display:none}}.print-btn{background:#059669;color:white;padding:10px 30px;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:20px}</style></head><body><h1>⭐ تقرير نقاط المرحلة ${sectionName}</h1><div class="date-info">📅 ${hDate} | 📆 ${gDate}</div>${container.innerHTML}<div style="text-align:center;margin-top:20px"><button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div></body></html>`);
    printWindow.document.close();
}

// ============================================================
// ADMIN PANEL
// ============================================================
function showAdminPanel() { 
    const p = prompt("🔐 كلمة المرور:"); 
    if (p !== ADMIN_PASSWORD) { alert("❌ كلمة مرور غير صحيحة"); return; } 
    const s = prompt("اختر:\n1- ثانوي\n2- متوسط\n3- ابتدائي\n4- حذف كل البيانات"); 
    if (s === '4') { resetAllData(); return; } 
    let sec; 
    if (s === '1') sec = 'highschool'; 
    else if (s === '2') sec = 'middleschool'; 
    else if (s === '3') sec = 'elementary'; 
    else return; 
    const a = prompt("1- إضافة طالب\n2- حذف طالب"); 
    if (a === '1') addNewStudent(sec); 
    else if (a === '2') deleteStudent(sec); 
}

function addNewStudent(sec) { 
    const cnt = parseInt(localStorage.getItem(`studentCount_${sec}`) || '50') + 1;
        localStorage.setItem(`studentCount_${sec}`, cnt);
    if (sec === currentSection) { totalStudents = cnt; updateStudentDropdown(); } 
    markDataChanged();  // ✅ ADD THIS LINE
    syncToCloud();
    alert(`✅ تمت إضافة طالب جديد!\nالمرحلة: ${SECTION_NAMES[sec]}\nالعدد الآن: ${cnt}`); 
}

function deleteStudent(sec) { 
    const cnt = parseInt(localStorage.getItem(`studentCount_${sec}`) || '50');
    const n = parseInt(prompt(`أدخل رقم الطالب المراد حذفه (1-${cnt}):`)); 
    if (isNaN(n) || n < 1 || n > cnt) { alert("رقم غير صحيح"); return; } 
    if (!confirm(`حذف الطالب رقم ${n} من ${SECTION_NAMES[sec]}؟`)) return;
    
        localStorage.removeItem(`quran_${sec}-${n}`);
    for (let i = n; i < cnt; i++) {
        const old = localStorage.getItem(`quran_${sec}-${i+1}`);
        if (old) { localStorage.setItem(`quran_${sec}-${i}`, old); } 
        else { localStorage.removeItem(`quran_${sec}-${i}`); }
    }
    localStorage.removeItem(`quran_${sec}-${cnt}`);
    localStorage.setItem(`studentCount_${sec}`, cnt - 1);
    
    if (sec === currentSection) { 
        totalStudents = cnt - 1; 
        if (currentStudentIndex >= totalStudents) currentStudentIndex = Math.max(0, totalStudents - 1); 
        loadStudent(currentStudentIndex + 1); 
        updateStudentDropdown(); 
    }
    markDataChanged();  // ✅ ADD THIS LINE
    syncToCloud();
    alert(`✅ تم حذف الطالب بنجاح!`); 
}

function resetAllData() { 
    if (!confirm("⚠️ تحذير: سيتم حذف جميع البيانات نهائياً!\n\nهل أنت متأكد؟")) return;
    if (prompt("اكتب: حذف جميع البيانات") !== "حذف جميع البيانات") { 
        alert("تم الإلغاء"); 
        return; 
    }
    
    // Clear localStorage on THIS device
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) { 
        const k = localStorage.key(i); 
        if (k.startsWith('quran_')) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
        localStorage.setItem('studentCount_highschool', '50'); 
    localStorage.setItem('studentCount_middleschool', '50'); 
    localStorage.setItem('studentCount_elementary', '50');
    
    markDataChanged();  // ✅ ADD THIS LINE
    syncToCloud();
    
    // Wait a moment for sync to complete, then reload
    setTimeout(() => {
        alert("✅ تم حذف جميع البيانات ومزامنتها!\nسيتم تحديث الصفحة.");
        location.reload();
    }, 1000);
}
// ============================================================
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
                event: 'UPDATE',
                schema: 'public',
                table: SUPABASE_TABLE,
                filter: 'key=eq.main_data'
            },
            (payload) => {
                if (!isOwnChange) {
                    console.log('🔄 Change detected from another device! Reloading...');
                    loadFromCloud().then(() => {
                        location.reload();
                    });
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Connected to real-time sync');
            }
        });
}
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
    if (data.hifz) parts.push(`حفظ: ${data.hifz.startSurahName} ${data.hifz.startVerse}→${data.hifz.endVerse}`);
    if (data.rabt?.length) parts.push(`ربط: ${data.rabt.length} سور`);
    if (data.murajaa) parts.push(`مراجعة: ${data.murajaa.startSurahName} ${data.murajaa.startVerse}→${data.murajaa.endVerse}`);
    parts.push(`حضور: ${data.attendance}`);
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
        alert(`✅ تم مزامنة ${pendingLogs.length} سجل بنجاح`);
        
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
    
    const printWindow = window.open('', '_blank');
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    
    let html = `
        <!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
        <title>سجل التغييرات</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body{font-family:'Cairo',sans-serif;direction:rtl;padding:20px}
            h1{color:#065f46;text-align:center}
            .filters{text-align:center;margin-bottom:20px;color:#666}
            table{width:100%;border-collapse:collapse;margin-top:20px}
            th{background:#047857;color:white;padding:10px}
            td{padding:8px;border-bottom:1px solid #ddd;text-align:center}
            @media print{button{display:none}}
            .print-btn{background:#059669;color:white;padding:10px 30px;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:20px}
        </style>
        </head><body>
        <h1>📜 سجل التغييرات</h1>
        <div class="filters">
            ${teacherFilter !== 'all' ? '👤 المعلم: ' + teacherFilter : ''}
            ${sectionFilter !== 'all' ? ' | 🏫 المرحلة: ' + sectionFilter : ''}
            ${dateFilter ? ' | 📅 التاريخ: ' + dateFilter : ''}
        </div>
        <div style="text-align:center">📅 ${hDate} | 📆 ${gDate}</div>
        <table><tr><th>التاريخ</th><th>المعلم</th><th>الطالب</th><th>المرحلة</th><th>الإجراء</th></tr>`;
    
    filtered.forEach(log => {
        const date = new Date(log.timestamp || log.created_at).toLocaleString('ar-SA');
        const teacher = log.teacherName || log.teacher_name || '-';
        const student = log.studentName || log.student_name || '-';
        const section = log.section || '-';
        const details = log.details || '-';
        html += `<tr><td>${date}</td><td>${teacher}</td><td>${student}</td><td>${section}</td><td>${details}</td></tr>`;
    });
    
    html += `</table><div style="text-align:center;margin-top:20px"><button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div></body></html>`;
    
    printWindow.document.write(html);
    printWindow.document.close();
}
window.onload = () => {
    subscribeToRealtimeChanges();
    loadQuranData();
};

