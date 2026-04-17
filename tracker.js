// ============================================================
// SUPABASE CLOUD SYNC (Connected)
// ============================================================
const SUPABASE_URL = "https://dklyyzbnapkxlluximzk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrbHl5emJuYXBreGxsdXhpbXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjEwMDIsImV4cCI6MjA5MTgzNzAwMn0.qpCqvUTia4ywEMPSYJ_rIB4pSlk0zkvq5cQa-sFaFEs";
const SUPABASE_TABLE = "quran_data";
const SUPABASE_ENABLED = true;
// History tracking
const HISTORY_ENABLED = true;
// Initialize Supabase client (after the script loads)
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
let realtimeChannel = null;
let isOwnChange = false;

// ============================================================
// SMART SYNC - Only syncs when data actually changed
// ============================================================
let hasUnsavedChanges = false;
let isTabActive = true;

document.addEventListener('visibilitychange', function() {
    isTabActive = !document.hidden;
    console.log(isTabActive ? '👁️ Tab active' : '💤 Tab inactive');
    
    // If tab becomes active and there are pending changes, sync immediately
    if (isTabActive && hasUnsavedChanges) {
        console.log('🔄 Tab active with pending changes - syncing...');
        syncToCloud();
    }
});

// ============================================================
// QURAN PAGE MAPPING (Madinah Mushaf - 604 Pages)
// ============================================================
const QURAN_PAGES = {
    1: { startPage: 1, endPage: 1 },
    2: { startPage: 2, endPage: 49 },
    3: { startPage: 50, endPage: 76 },
    4: { startPage: 77, endPage: 106 },
    5: { startPage: 106, endPage: 127 },
    6: { startPage: 128, endPage: 150 },
    7: { startPage: 151, endPage: 176 },
    8: { startPage: 177, endPage: 186 },
    9: { startPage: 187, endPage: 207 },
    10: { startPage: 208, endPage: 221 },
    11: { startPage: 221, endPage: 235 },
    12: { startPage: 235, endPage: 248 },
    13: { startPage: 249, endPage: 255 },
    14: { startPage: 255, endPage: 261 },
    15: { startPage: 262, endPage: 267 },
    16: { startPage: 267, endPage: 281 },
    17: { startPage: 282, endPage: 293 },
    18: { startPage: 293, endPage: 304 },
    19: { startPage: 305, endPage: 312 },
    20: { startPage: 312, endPage: 321 },
    21: { startPage: 322, endPage: 331 },
    22: { startPage: 332, endPage: 341 },
    23: { startPage: 342, endPage: 349 },
    24: { startPage: 350, endPage: 359 },
    25: { startPage: 359, endPage: 366 },
    26: { startPage: 367, endPage: 376 },
    27: { startPage: 377, endPage: 385 },
    28: { startPage: 385, endPage: 396 },
    29: { startPage: 396, endPage: 404 },
    30: { startPage: 404, endPage: 410 },
    31: { startPage: 411, endPage: 414 },
    32: { startPage: 415, endPage: 417 },
    33: { startPage: 418, endPage: 427 },
    34: { startPage: 428, endPage: 434 },
    35: { startPage: 434, endPage: 440 },
    36: { startPage: 440, endPage: 445 },
    37: { startPage: 446, endPage: 452 },
    38: { startPage: 453, endPage: 458 },
    39: { startPage: 458, endPage: 467 },
    40: { startPage: 467, endPage: 476 },
    41: { startPage: 477, endPage: 482 },
    42: { startPage: 483, endPage: 489 },
    43: { startPage: 489, endPage: 495 },
    44: { startPage: 496, endPage: 498 },
    45: { startPage: 499, endPage: 502 },
    46: { startPage: 502, endPage: 506 },
    47: { startPage: 507, endPage: 510 },
    48: { startPage: 511, endPage: 515 },
    49: { startPage: 515, endPage: 517 },
    50: { startPage: 518, endPage: 520 },
    51: { startPage: 520, endPage: 523 },
    52: { startPage: 523, endPage: 525 },
    53: { startPage: 526, endPage: 528 },
    54: { startPage: 528, endPage: 531 },
    55: { startPage: 531, endPage: 534 },
    56: { startPage: 534, endPage: 537 },
    57: { startPage: 537, endPage: 541 },
    58: { startPage: 542, endPage: 545 },
    59: { startPage: 545, endPage: 548 },
    60: { startPage: 549, endPage: 551 },
    61: { startPage: 551, endPage: 553 },
    62: { startPage: 553, endPage: 554 },
    63: { startPage: 554, endPage: 556 },
    64: { startPage: 556, endPage: 558 },
    65: { startPage: 558, endPage: 560 },
    66: { startPage: 560, endPage: 562 },
    67: { startPage: 562, endPage: 564 },
    68: { startPage: 564, endPage: 566 },
    69: { startPage: 566, endPage: 568 },
    70: { startPage: 568, endPage: 570 },
    71: { startPage: 570, endPage: 572 },
    72: { startPage: 572, endPage: 574 },
    73: { startPage: 574, endPage: 575 },
    74: { startPage: 575, endPage: 577 },
    75: { startPage: 577, endPage: 578 },
    76: { startPage: 578, endPage: 580 },
    77: { startPage: 580, endPage: 581 },
    78: { startPage: 582, endPage: 583 },
    79: { startPage: 583, endPage: 584 },
    80: { startPage: 585, endPage: 585 },
    81: { startPage: 586, endPage: 586 },
    82: { startPage: 587, endPage: 587 },
    83: { startPage: 587, endPage: 589 },
    84: { startPage: 589, endPage: 590 },
    85: { startPage: 590, endPage: 590 },
    86: { startPage: 591, endPage: 591 },
    87: { startPage: 591, endPage: 592 },
    88: { startPage: 592, endPage: 593 },
    89: { startPage: 593, endPage: 594 },
    90: { startPage: 594, endPage: 595 },
    91: { startPage: 595, endPage: 595 },
    92: { startPage: 595, endPage: 596 },
    93: { startPage: 596, endPage: 596 },
    94: { startPage: 596, endPage: 597 },
    95: { startPage: 597, endPage: 597 },
    96: { startPage: 597, endPage: 598 },
    97: { startPage: 598, endPage: 598 },
    98: { startPage: 598, endPage: 599 },
    99: { startPage: 599, endPage: 599 },
    100: { startPage: 599, endPage: 600 },
    101: { startPage: 600, endPage: 600 },
    102: { startPage: 600, endPage: 600 },
    103: { startPage: 601, endPage: 601 },
    104: { startPage: 601, endPage: 601 },
    105: { startPage: 601, endPage: 601 },
    106: { startPage: 602, endPage: 602 },
    107: { startPage: 602, endPage: 602 },
    108: { startPage: 602, endPage: 602 },
    109: { startPage: 603, endPage: 603 },
    110: { startPage: 603, endPage: 603 },
    111: { startPage: 603, endPage: 603 },
    112: { startPage: 604, endPage: 604 },
    113: { startPage: 604, endPage: 604 },
    114: { startPage: 604, endPage: 604 }
};

// ============================================================
// HISTORY LOGGING (Local Only During Day)
// ============================================================
function logTeacherAction(studentName, actionType, details) {
    if (!HISTORY_ENABLED) return;
    
    const session = JSON.parse(sessionStorage.getItem('quranTrackerSession'));
    const teacherName = session ? session.displayName : 'غير معروف';
    
    const logEntry = {
        id: Date.now() + Math.random().toString(36),
        teacherName: teacherName,
        studentName: studentName,
        section: currentSection,
        actionType: actionType,
        details: details,
        timestamp: new Date().toISOString(),
        synced: false
    };
    
    // Get existing logs
    const existingLogs = JSON.parse(localStorage.getItem('pendingHistoryLogs') || '[]');
    existingLogs.push(logEntry);
    
    // Save back to localStorage
    localStorage.setItem('pendingHistoryLogs', JSON.stringify(existingLogs));
    
    console.log('📝 Logged locally:', teacherName, actionType, studentName);
}

// ============================================================
// HISTORY TAB FUNCTIONS
// ============================================================
let allHistoryLogs = [];

async function loadHistoryTab() {
    if (!isAdmin()) {
        alert('غير مصرح لك بالدخول');
        switchSection('highschool');
        return;
    }
    
    document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center;">⏳ جاري التحميل...</td></tr>';
    
    allHistoryLogs = await loadHistoryFromCloud();
    displayFilteredHistory();
}

function displayFilteredHistory() {
    const filter = document.getElementById('historyTeacherFilter')?.value || 'all';
    const tbody = document.getElementById('historyTableBody');
    
    const filtered = filter === 'all' 
        ? allHistoryLogs 
        : allHistoryLogs.filter(log => log.teacher_name === filter);
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد سجلات</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(log => {
        const date = new Date(log.created_at).toLocaleString('ar-SA');
        return `
            <tr>
                <td>${date}</td>
                <td>${log.teacher_name || '-'}</td>
                <td>${log.student_name || '-'}</td>
                <td>${log.section || '-'}</td>
                <td>${log.details || '-'}</td>
            </tr>
        `;
    }).join('');
}

function filterHistory() {
    displayFilteredHistory();
}

function exportHistoryPDF() {
    const filter = document.getElementById('historyTeacherFilter')?.value || 'all';
    const filtered = filter === 'all' 
        ? allHistoryLogs 
        : allHistoryLogs.filter(log => log.teacher_name === filter);
    
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
            table{width:100%;border-collapse:collapse;margin-top:20px}
            th{background:#047857;color:white;padding:10px}
            td{padding:8px;border-bottom:1px solid #ddd;text-align:center}
            @media print{button{display:none}}
            .print-btn{background:#059669;color:white;padding:10px 30px;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:20px}
        </style>
        </head><body>
        <h1>📜 سجل التغييرات</h1>
        <div style="text-align:center">📅 ${hDate} | 📆 ${gDate}</div>
        <table><tr><th>التاريخ</th><th>المعلم</th><th>الطالب</th><th>المرحلة</th><th>الإجراء</th></tr>`;
    
    filtered.forEach(log => {
        const date = new Date(log.created_at).toLocaleString('ar-SA');
        html += `<tr><td>${date}</td><td>${log.teacher_name}</td><td>${log.student_name}</td><td>${log.section}</td><td>${log.details}</td></tr>`;
    });
    
    html += `</table><div style="text-align:center;margin-top:20px"><button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div></body></html>`;
    
    printWindow.document.write(html);
    printWindow.document.close();
}

// ============================================================
// SYNC FUNCTIONS (OPTIMIZED - Only syncs when changes exist)
// ============================================================
async function syncToCloud() {
    if (!SUPABASE_ENABLED) return;
    if (!hasUnsavedChanges) {
        console.log('⏭️ No changes to sync');
        return;
    }
    
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('quran_') || key.startsWith('studentCount_')) {
            allData[key] = localStorage.getItem(key);
        }
    }
    
    try {
        isOwnChange = true;
        
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
        
        if (!response.ok && response.status === 404) {
            await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: 'main_data',
                    value: JSON.stringify(allData),
                    updated_at: new Date().toISOString()
                })
            });
        }
        
        hasUnsavedChanges = false;  // ✅ Reset flag after successful sync
        console.log('✅ Synced to Supabase');
        setTimeout(() => { isOwnChange = false; }, 500);
        
    } catch (e) {
        console.error('Sync error:', e);
        isOwnChange = false;
        // Keep hasUnsavedChanges = true so it will retry later
    }
}

function markDataChanged() {
    hasUnsavedChanges = true;
    console.log('📝 Data changed - will sync soon');
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
        
        if (data && data[0] && data[0].value) {
            const cloudData = JSON.parse(data[0].value);
            
            // Delete all local Quran data
            const keysToDelete = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('quran_') || key.startsWith('studentCount_')) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => localStorage.removeItem(key));
            
            // Load cloud data into localStorage
            for (const key in cloudData) {
                localStorage.setItem(key, cloudData[key]);
            }
            
            hasUnsavedChanges = false;  // ✅ Just loaded from cloud, no pending changes
            console.log('✅ Loaded from Supabase');
            return true;
        }
        return false;
    } catch (e) {
        console.error('Load error:', e);
        return false;
    }
}

async function subscribeToRealtimeChanges() {
    if (!SUPABASE_ENABLED) return;
    
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
        // Sync any pending changes before logout
        if (hasUnsavedChanges) {
            syncToCloud();
        }
        sessionStorage.removeItem('quranTrackerSession'); 
        window.location.href = 'login.html'; 
    } 
}

let surahsData = [];
let currentSection = 'highschool';
let currentStudentIndex = 0;
let totalStudents = 50;
let currentReportMonth = new Date();
let currentReportDate = new Date().toISOString().split('T')[0];
let currentAttendance = 'حاضر';
let rabtCounter = 0;

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
// HELPER FUNCTIONS FOR CONTAINERS AND SELECTS
// ============================================================
function getContainerId() {
    if (currentSection === 'middleschool') return 'studentCardContainerM';
    if (currentSection === 'elementary') return 'studentCardContainerE';
    return 'studentCardContainer';
}

function getSelectId() {
    if (currentSection === 'middleschool') return 'studentJumpSelect-middleschool';
    if (currentSection === 'elementary') return 'studentJumpSelect-elementary';
    return 'studentJumpSelect-highschool';
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
    
    const containerId = getContainerId();
    const container = document.getElementById(containerId);
    
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
            <button class="save-btn" onclick="saveCurrentStudent(event)">💾 حفظ</button>
        </div>
    `;
    
    rabtCounter = 0;
    const rabtContainer = document.getElementById('rabtContainer');
    if (rabtContainer) {
        rabtContainer.innerHTML = '';
        if (data.rabt && data.rabt.length > 0) { 
            data.rabt.forEach(r => addRabtItem(r)); 
        } else { 
            addRabtItem(); 
        }
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
                    setTimeout(() => {
                        const endVerse = document.getElementById('hifzEndVerse');
                        if (endVerse) endVerse.value = data.hifz.endVerse;
                    }, 30);
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
                    setTimeout(() => {
                        const endVerse = document.getElementById('murajaaEndVerse');
                        if (endVerse) endVerse.value = data.murajaa.endVerse;
                    }, 30);
                }, 30);
            }
        }, 30);
    }
}

function addRabtItem(existing = null) {
    const container = document.getElementById('rabtContainer');
    if (!container) {
        console.error('Rabt container not found');
        return;
    }
    
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
                    setTimeout(() => {
                        const endVerse = item.querySelector('.rabt-end-verse');
                        if (endVerse) endVerse.value = existing.endVerse;
                    }, 30);
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
    const startSurah = document.getElementById(`${task}StartSurah`)?.value;
    const startVerse = document.getElementById(`${task}StartVerse`);
    if (startVerse) updateVerseOptions(startSurah, startVerse, 'من آية'); 
}

function updateEndVerses(task) { 
    const endSurah = document.getElementById(`${task}EndSurah`)?.value;
    const endVerse = document.getElementById(`${task}EndVerse`);
    if (endVerse) updateVerseOptions(endSurah, endVerse, 'إلى آية'); 
}

function updateRabtStartVerses(id) { 
    const item = document.getElementById(id);
    if (!item) return;
    const s = item.querySelector('.rabt-start-surah')?.value; 
    const verseSelect = item.querySelector('.rabt-start-verse');
    if (verseSelect) updateVerseOptions(s, verseSelect, 'من آية'); 
}

function updateRabtEndVerses(id) { 
    const item = document.getElementById(id);
    if (!item) return;
    const s = item.querySelector('.rabt-end-surah')?.value; 
    const verseSelect = item.querySelector('.rabt-end-verse');
    if (verseSelect) updateVerseOptions(s, verseSelect, 'إلى آية'); 
}

function setAttendance(val) { 
    currentAttendance = val; 
    document.querySelectorAll('.attendance-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.includes(val));
    });
}

function saveCurrentStudent(evt) {
    const studentNum = currentStudentIndex + 1;
    const sid = `${currentSection}-${studentNum}`;
    
    const nameInput = document.getElementById('studentName');
    const name = nameInput ? nameInput.value.trim() : '';
    const finalName = name || `طالب ${studentNum}`;
    
    const quran = document.getElementById('quranCheck')?.checked || false;
    const uniform = document.getElementById('uniformCheck')?.checked || false;
    const pointsInput = document.getElementById('pointsInput');
    const points = pointsInput ? (parseInt(pointsInput.value) || 0) : 0;
    
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
            endSurahName: surahsData.find(s => s.number == he)?.name || ''
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
            endSurahName: surahsData.find(s => s.number == me)?.name || ''
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
                endSurahName: surahsData.find(s => s.number == es)?.name || ''
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
    
    localStorage.setItem(`quran_${sid}`, JSON.stringify(data));
    logTeacherAction(finalName, 'حفظ', getActionSummary(data));
    updateStudentDropdown();
    
    markDataChanged();  // ✅ Mark that data changed
    syncToCloud();      // ✅ Sync immediately after save
    
    const btn = evt ? evt.target : null;
    if (btn) {
        btn.textContent = '✅ تم الحفظ!';
        setTimeout(() => btn.textContent = '💾 حفظ', 1500);
    }
}

function getActionSummary(data) {
    const parts = [];
    
    if (data.hifz) {
        parts.push(`حفظ: ${data.hifz.startSurahName} ${data.hifz.startVerse}→${data.hifz.endVerse}`);
    }
    if (data.rabt && data.rabt.length > 0) {
        parts.push(`ربط: ${data.rabt.length} سور`);
    }
    if (data.murajaa) {
        parts.push(`مراجعة: ${data.murajaa.startSurahName} ${data.murajaa.startVerse}→${data.murajaa.endVerse}`);
    }
    if (data.points > 0) {
        parts.push(`نقاط: ${data.points}`);
    }
    parts.push(`حضور: ${data.attendance}`);
    
    return parts.join(' | ') || 'تحديث البيانات';
}

// ============================================================
// NAVIGATION
// ============================================================
function switchSection(section) {
    currentSection = section;
    
    // Hide all sections
    document.querySelectorAll('.tracker-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`section-${section}`).classList.remove('hidden');
    
    // Update tabs
    document.querySelectorAll('.tab').forEach((t, i) => {
        const sections = ['highschool', 'middleschool', 'elementary', 'reports', 'history'];
        t.classList.toggle('active', sections[i] === section);
    });
    
    // Hide history tab for non-admin
    if (!isAdmin()) {
        document.getElementById('tab-history')?.classList.add('hidden');
    } else {
        document.getElementById('tab-history')?.classList.remove('hidden');
    }
    
    if (section === 'history') {
        loadHistoryTab();
    } else if (section === 'reports') {
        loadReportsData();
        loadDailyReport();
        loadPointsReport();
    } else {
        loadStudentCounts();
        currentStudentIndex = 0;
        updateStudentDropdown();
        loadStudent(1);
    }
}

function updateStudentDropdown() {
    const selectId = getSelectId();
    const select = document.getElementById(selectId); 
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
    const selectId = getSelectId();
    const select = document.getElementById(selectId);
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
        highschool: { hifz:0, rabt:0, murajaa:0, pages:0 }, 
        middleschool: { hifz:0, rabt:0, murajaa:0, pages:0 }, 
        elementary: { hifz:0, rabt:0, murajaa:0, pages:0 } 
    };
    
    function getPages(task) {
        if (!task) return 0;
        
        const startSurah = parseInt(task.startSurah);
        const endSurah = parseInt(task.endSurah);
        const startVerse = parseInt(task.startVerse) || 1;
        const endVerse = parseInt(task.endVerse) || AYAH_COUNTS[endSurah - 1] || 1;
        
        if (isNaN(startSurah) || isNaN(endSurah)) return 1;
        
        let totalPages = 0;
        
        if (startSurah === endSurah) {
            if (QURAN_PAGES[startSurah]) {
                const surahPages = QURAN_PAGES[startSurah].endPage - QURAN_PAGES[startSurah].startPage + 1;
                const totalAyahs = AYAH_COUNTS[startSurah - 1] || 1;
                const ayahsRecited = endVerse - startVerse + 1;
                const portion = ayahsRecited / totalAyahs;
                const pages = Math.max(1, Math.round(surahPages * portion));
                return pages;
            }
        } else {
            for (let s = startSurah; s <= endSurah; s++) {
                if (!QURAN_PAGES[s]) continue;
                
                const surahPages = QURAN_PAGES[s].endPage - QURAN_PAGES[s].startPage + 1;
                const totalAyahs = AYAH_COUNTS[s - 1] || 1;
                
                if (s === startSurah) {
                    const ayahsRecited = totalAyahs - startVerse + 1;
                    const portion = ayahsRecited / totalAyahs;
                    const pages = Math.max(1, Math.round(surahPages * portion));
                    totalPages += pages;
                } else if (s === endSurah) {
                    const ayahsRecited = endVerse;
                    const portion = ayahsRecited / totalAyahs;
                    const pages = Math.max(1, Math.round(surahPages * portion));
                    totalPages += pages;
                } else {
                    totalPages += surahPages;
                }
            }
        }
        
        return totalPages;
    }
    
    for (let i = 0; i < localStorage.length; i++) { 
        const k = localStorage.key(i); 
        if (k.startsWith('quran_')) { 
            try { 
                const d = JSON.parse(localStorage.getItem(k)); 
                if (d?.savedAt && new Date(d.savedAt).getFullYear() === y && new Date(d.savedAt).getMonth() === m) { 
                    if (d.section && data[d.section]) { 
                        if (d.hifz) {
                            data[d.section].hifz += 1;
                            data[d.section].pages += getPages(d.hifz);
                        }
                        if (d.rabt && Array.isArray(d.rabt)) {
                            data[d.section].rabt += d.rabt.length;
                            d.rabt.forEach(r => {
                                data[d.section].pages += getPages(r);
                            });
                        }
                        if (d.murajaa) {
                            data[d.section].murajaa += 1;
                            data[d.section].pages += getPages(d.murajaa);
                        }
                    } 
                } 
            } catch (e) { 
                console.error('Error parsing data:', e);
            } 
        } 
    }
    
    ['highschool','middleschool','elementary'].forEach(s => { 
        const d = data[s]; 
        document.getElementById(`${s}-summary`).innerHTML = `
            <table class="summary-table">
                <thead><tr><th>المهمة</th><th>عدد المرات</th></tr></thead>
                <tbody>
                    <tr><td>📖 حفظ</td><td>${d.hifz}</td></tr>
                    <tr><td>🔗 ربط</td><td>${d.rabt}</td></tr>
                    <tr><td>📚 مراجعة</td><td>${d.murajaa}</td></tr>
                    <tr class="total-row"><td>📖 إجمالي الصفحات</td><td>${d.pages}</td></tr>
                </tbody>
            </table>
        `; 
    });
    
    const totalPages = data.highschool.pages + data.middleschool.pages + data.elementary.pages;
    const khatmahCount = (totalPages / 604).toFixed(2);
    
    document.getElementById('grand-total-pages').textContent = totalPages;
    document.getElementById('grand-total-khatmah').textContent = khatmahCount;
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
    const gDate = getGregorianDate();
    const hDate = document.getElementById('hijriDate').textContent;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير ${sectionName} اليومي</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:'Cairo',sans-serif;direction:rtl;padding:20px}h1{color:#065f46;text-align:center}.date-info{text-align:center;color:#047857;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#047857;color:white;padding:10px}td{padding:8px;border-bottom:1px solid #ddd;text-align:center}@media print{button{display:none}}.print-btn{background:#059669;color:white;padding:10px 30px;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:20px}</style></head><body><h1>📋 تقرير المرحلة ${sectionName} اليومي</h1><div class="date-info">📅 ${hDate} | 📆 ${gDate}</div>${el.innerHTML}<div style="text-align:center;margin-top:20px"><button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div></body></html>`);
    printWindow.document.close();
}

function exportMonthlyReport(l) { 
    const sectionName = SECTION_NAMES[l];
    const monthStr = currentReportMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
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
    if (sec === currentSection) { 
        totalStudents = cnt; 
        updateStudentDropdown(); 
    } 
    markDataChanged();  // ✅ Mark that data changed
    syncToCloud();      // ✅ Sync immediately
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
    markDataChanged();  // ✅ Mark that data changed
    syncToCloud();      // ✅ Sync immediately
    alert(`✅ تم حذف الطالب بنجاح!`); 
}

function resetAllData() { 
    if (!confirm("⚠️ تحذير: سيتم حذف جميع البيانات نهائياً!\n\nهل أنت متأكد؟")) return;
    if (prompt("اكتب: حذف جميع البيانات") !== "حذف جميع البيانات") { 
        alert("تم الإلغاء"); 
        return; 
    }
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) { 
        const k = localStorage.key(i); 
        if (k.startsWith('quran_')) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    localStorage.setItem('studentCount_highschool', '50'); 
    localStorage.setItem('studentCount_middleschool', '50'); 
    localStorage.setItem('studentCount_elementary', '50');
    
    markDataChanged();  // ✅ Mark that data changed
    syncToCloud();      // ✅ Sync immediately
    
    setTimeout(() => {
        alert("✅ تم حذف جميع البيانات ومزامنتها!\nسيتم تحديث الصفحة.");
        location.reload();
    }, 1000);
}

// ============================================================
// CHECK IF CURRENT USER IS ADMIN
// ============================================================
function isAdmin() {
    const session = JSON.parse(sessionStorage.getItem('quranTrackerSession') || '{}');
    return session.username === 'Admin.2123' || session.displayName === 'المدير';
}

// ============================================================
// SYNC HISTORY TO CLOUD
// ============================================================
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
                    section: SECTION_NAMES[log.section] || log.section,
                    action_type: log.actionType,
                    details: log.details,
                    created_at: log.timestamp
                })
            });
        }
        
        localStorage.removeItem('pendingHistoryLogs');
        alert(`✅ تم مزامنة ${pendingLogs.length} سجل بنجاح`);
        
    } catch (e) {
        console.error('History sync error:', e);
        alert('❌ فشلت المزامنة. حاول مرة أخرى.');
    }
}

async function loadHistoryFromCloud() {
    if (!isAdmin()) return [];
    
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
        return data;
    } catch (e) {
        console.error('Load history error:', e);
        return [];
    }
}

// ============================================================
// INITIALIZATION
// ============================================================
window.onload = () => {
    subscribeToRealtimeChanges();
    loadQuranData();
};

// Sync interval - only syncs if there are pending changes AND tab is active
setInterval(() => {
    if (isTabActive && SUPABASE_ENABLED && hasUnsavedChanges) {
        console.log('🔄 Auto-syncing pending changes...');
        syncToCloud();
    }
}, 15000); // Check every 15 seconds, but only sync if changes exist
