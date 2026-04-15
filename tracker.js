// ============================================================
// SESSION & GLOBALS
// ============================================================
function checkAuth() {
    const session = sessionStorage.getItem('quranTrackerSession');
    if (!session) { window.location.href = 'login.html'; return false; }
    try {
        const data = JSON.parse(session);
        if (new Date(data.expiresAt) < new Date()) { sessionStorage.removeItem('quranTrackerSession'); window.location.href = 'login.html'; return false; }
        document.getElementById('loggedInUser').textContent = `مرحباً، ${data.displayName}`;
        return true;
    } catch (e) { sessionStorage.removeItem('quranTrackerSession'); window.location.href = '.html'; return false; }
}
function logout() { if (confirm('تسجيل الخروج؟')) { sessionStorage.removeItem('quranTrackerSession'); window.location.href = 'login.html'; } }

let surahsData = [], currentSection = 'highschool', currentStudentIndex = 0, totalStudents = 50;
let currentReportMonth = new Date(), currentReportDate = new Date().toISOString().split('T')[0];
let currentAttendance = 'حاضر';
const SECTION_NAMES = { highschool: 'ثانوي', middleschool: 'متوسط', elementary: 'ابتدائي' };
const ADMIN_PASSWORD = "224312";

// ============================================================
// DATE FUNCTIONS
// ============================================================
function getGregorianDate() { return new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
async function getHijriDate() {
    try { const d = new Date(); const r = await fetch(`https://api.aladhan.com/v1/gToH?date=${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`); const data = await r.json(); if (data.data?.hijri) return `${data.data.hijri.day} ${data.data.hijri.month.ar} ${data.data.hijri.year}`; } catch (e) {}
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}
async function updateDateDisplay() { 
    document.getElementById('gregorianDate').textContent = getGregorianDate(); 
    document.getElementById('hijriDate').textContent = await getHijriDate(); 
}

// ============================================================
// QURAN PAGE MAPPING
// ============================================================
const QURAN_PAGES = {
    1: { name: "الفاتحة", startPage: 1, endPage: 1, ayahs: 7 }, 2: { name: "البقرة", startPage: 2, endPage: 49, ayahs: 286 },
    3: { name: "آل عمران", startPage: 50, endPage: 76, ayahs: 200 }, 4: { name: "النساء", startPage: 77, endPage: 105, ayahs: 176 },
    5: { name: "المائدة", startPage: 106, endPage: 127, ayahs: 120 }, 6: { name: "الأنعام", startPage: 128, endPage: 150, ayahs: 165 },
    7: { name: "الأعراف", startPage: 151, endPage: 176, ayahs: 206 }, 8: { name: "الأنفال", startPage: 177, endPage: 186, ayahs: 75 },
    9: { name: "التوبة", startPage: 187, endPage: 207, ayahs: 129 }, 10: { name: "يونس", startPage: 208, endPage: 221, ayahs: 109 },
    11: { name: "هود", startPage: 222, endPage: 235, ayahs: 123 }, 12: { name: "يوسف", startPage: 236, endPage: 248, ayahs: 111 },
    13: { name: "الرعد", startPage: 249, endPage: 255, ayahs: 43 }, 14: { name: "إبراهيم", startPage: 256, endPage: 261, ayahs: 52 },
    15: { name: "الحجر", startPage: 262, endPage: 267, ayahs: 99 }, 16: { name: "النحل", startPage: 268, endPage: 281, ayahs: 128 },
    17: { name: "الإسراء", startPage: 282, endPage: 293, ayahs: 111 }, 18: { name: "الكهف", startPage: 294, endPage: 304, ayahs: 110 },
    19: { name: "مريم", startPage: 305, endPage: 312, ayahs: 98 }, 20: { name: "طه", startPage: 313, endPage: 321, ayahs: 135 },
    21: { name: "الأنبياء", startPage: 322, endPage: 331, ayahs: 112 }, 22: { name: "الحج", startPage: 332, endPage: 341, ayahs: 78 },
    23: { name: "المؤمنون", startPage: 342, endPage: 349, ayahs: 118 }, 24: { name: "النور", startPage: 350, endPage: 359, ayahs: 64 },
    25: { name: "الفرقان", startPage: 360, endPage: 366, ayahs: 77 }, 26: { name: "الشعراء", startPage: 367, endPage: 376, ayahs: 227 },
    27: { name: "النمل", startPage: 377, endPage: 385, ayahs: 93 }, 28: { name: "القصص", startPage: 386, endPage: 396, ayahs: 88 },
    29: { name: "العنكبوت", startPage: 397, endPage: 404, ayahs: 69 }, 30: { name: "الروم", startPage: 405, endPage: 410, ayahs: 60 },
    31: { name: "لقمان", startPage: 411, endPage: 414, ayahs: 34 }, 32: { name: "السجدة", startPage: 415, endPage: 417, ayahs: 30 },
    33: { name: "الأحزاب", startPage: 418, endPage: 427, ayahs: 73 }, 34: { name: "سبأ", startPage: 428, endPage: 434, ayahs: 54 },
    35: { name: "فاطر", startPage: 435, endPage: 439, ayahs: 45 }, 36: { name: "يس", startPage: 440, endPage: 445, ayahs: 83 },
    37: { name: "الصافات", startPage: 446, endPage: 452, ayahs: 182 }, 38: { name: "ص", startPage: 453, endPage: 458, ayahs: 88 },
    39: { name: "الزمر", startPage: 459, endPage: 467, ayahs: 75 }, 40: { name: "غافر", startPage: 468, endPage: 476, ayahs: 85 },
    41: { name: "فصلت", startPage: 477, endPage: 482, ayahs: 54 }, 42: { name: "الشورى", startPage: 483, endPage: 489, ayahs: 53 },
    43: { name: "الزخرف", startPage: 490, endPage: 495, ayahs: 89 }, 44: { name: "الدخان", startPage: 496, endPage: 498, ayahs: 59 },
    45: { name: "الجاثية", startPage: 499, endPage: 502, ayahs: 37 }, 46: { name: "الأحقاف", startPage: 503, endPage: 506, ayahs: 35 },
    47: { name: "محمد", startPage: 507, endPage: 510, ayahs: 38 }, 48: { name: "الفتح", startPage: 511, endPage: 515, ayahs: 29 },
    49: { name: "الحجرات", startPage: 516, endPage: 518, ayahs: 18 }, 50: { name: "ق", startPage: 519, endPage: 520, ayahs: 45 },
    51: { name: "الذاريات", startPage: 521, endPage: 523, ayahs: 60 }, 52: { name: "الطور", startPage: 524, endPage: 525, ayahs: 49 },
    53: { name: "النجم", startPage: 526, endPage: 528, ayahs: 62 }, 54: { name: "القمر", startPage: 529, endPage: 531, ayahs: 55 },
    55: { name: "الرحمن", startPage: 532, endPage: 534, ayahs: 78 }, 56: { name: "الواقعة", startPage: 535, endPage: 537, ayahs: 96 },
    57: { name: "الحديد", startPage: 538, endPage: 541, ayahs: 29 }, 58: { name: "المجادلة", startPage: 542, endPage: 545, ayahs: 22 },
    59: { name: "الحشر", startPage: 546, endPage: 548, ayahs: 24 }, 60: { name: "الممتحنة", startPage: 549, endPage: 551, ayahs: 13 },
    61: { name: "الصف", startPage: 552, endPage: 553, ayahs: 14 }, 62: { name: "الجمعة", startPage: 554, endPage: 554, ayahs: 11 },
    63: { name: "المنافقون", startPage: 555, endPage: 556, ayahs: 11 }, 64: { name: "التغابن", startPage: 557, endPage: 558, ayahs: 18 },
    65: { name: "الطلاق", startPage: 559, endPage: 560, ayahs: 12 }, 66: { name: "التحريم", startPage: 561, endPage: 562, ayahs: 12 },
    67: { name: "الملك", startPage: 563, endPage: 564, ayahs: 30 }, 68: { name: "القلم", startPage: 565, endPage: 566, ayahs: 52 },
    69: { name: "الحاقة", startPage: 567, endPage: 568, ayahs: 52 }, 70: { name: "المعارج", startPage: 569, endPage: 570, ayahs: 44 },
    71: { name: "نوح", startPage: 571, endPage: 572, ayahs: 28 }, 72: { name: "الجن", startPage: 573, endPage: 574, ayahs: 28 },
    73: { name: "المزمل", startPage: 575, endPage: 576, ayahs: 20 }, 74: { name: "المدثر", startPage: 577, endPage: 578, ayahs: 56 },
    75: { name: "القيامة", startPage: 579, endPage: 580, ayahs: 40 }, 76: { name: "الإنسان", startPage: 581, endPage: 582, ayahs: 31 },
    77: { name: "المرسلات", startPage: 583, endPage: 584, ayahs: 50 }, 78: { name: "النبأ", startPage: 585, endPage: 586, ayahs: 40 },
    79: { name: "النازعات", startPage: 587, endPage: 588, ayahs: 46 }, 80: { name: "عبس", startPage: 589, endPage: 590, ayahs: 42 },
    81: { name: "التكوير", startPage: 591, endPage: 591, ayahs: 29 }, 82: { name: "الإنفطار", startPage: 592, endPage: 592, ayahs: 19 },
    83: { name: "المطففين", startPage: 593, endPage: 594, ayahs: 36 }, 84: { name: "الإنشقاق", startPage: 595, endPage: 595, ayahs: 25 },
    85: { name: "البروج", startPage: 596, endPage: 596, ayahs: 22 }, 86: { name: "الطارق", startPage: 597, endPage: 597, ayahs: 17 },
    87: { name: "الأعلى", startPage: 598, endPage: 598, ayahs: 19 }, 88: { name: "الغاشية", startPage: 599, endPage: 599, ayahs: 26 },
    89: { name: "الفجر", startPage: 600, endPage: 600, ayahs: 30 }, 90: { name: "البلد", startPage: 601, endPage: 601, ayahs: 20 },
    91: { name: "الشمس", startPage: 602, endPage: 602, ayahs: 15 }, 92: { name: "الليل", startPage: 603, endPage: 603, ayahs: 21 },
    93: { name: "الضحى", startPage: 604, endPage: 604, ayahs: 11 }, 94: { name: "الشرح", startPage: 605, endPage: 605, ayahs: 8 },
    95: { name: "التين", startPage: 606, endPage: 606, ayahs: 8 }, 96: { name: "العلق", startPage: 607, endPage: 607, ayahs: 19 },
    97: { name: "القدر", startPage: 608, endPage: 608, ayahs: 5 }, 98: { name: "البينة", startPage: 609, endPage: 609, ayahs: 8 },
    99: { name: "الزلزلة", startPage: 610, endPage: 610, ayahs: 8 }, 100: { name: "العاديات", startPage: 611, endPage: 611, ayahs: 11 },
    101: { name: "القارعة", startPage: 612, endPage: 612, ayahs: 11 }, 102: { name: "التكاثر", startPage: 613, endPage: 613, ayahs: 8 },
    103: { name: "العصر", startPage: 614, endPage: 614, ayahs: 3 }, 104: { name: "الهمزة", startPage: 615, endPage: 615, ayahs: 9 },
    105: { name: "الفيل", startPage: 616, endPage: 616, ayahs: 5 }, 106: { name: "قريش", startPage: 617, endPage: 617, ayahs: 4 },
    107: { name: "الماعون", startPage: 618, endPage: 618, ayahs: 7 }, 108: { name: "الكوثر", startPage: 619, endPage: 619, ayahs: 3 },
    109: { name: "الكافرون", startPage: 620, endPage: 620, ayahs: 6 }, 110: { name: "النصر", startPage: 621, endPage: 621, ayahs: 3 },
    111: { name: "المسد", startPage: 622, endPage: 622, ayahs: 5 }, 112: { name: "الإخلاص", startPage: 623, endPage: 623, ayahs: 4 },
    113: { name: "الفلق", startPage: 624, endPage: 624, ayahs: 5 }, 114: { name: "الناس", startPage: 625, endPage: 625, ayahs: 6 }
};
const TOTAL_QURAN_PAGES = 604;

function calculatePages(startSurah, startVerse, endSurah, endVerse) {
    startSurah = parseInt(startSurah); endSurah = parseInt(endSurah);
    if (isNaN(startSurah) || isNaN(endSurah)) return 1;
    if (startSurah === endSurah) {
        const s = QURAN_PAGES[startSurah]; if (!s) return 1;
        const verses = parseInt(endVerse) - parseInt(startVerse) + 1;
        return Math.max(1, Math.round((verses / s.ayahs) * (s.endPage - s.startPage + 1)));
    }
    let pages = 0;
    const first = QURAN_PAGES[startSurah];
    if (first) pages += Math.max(1, Math.round(((first.ayahs - parseInt(startVerse) + 1) / first.ayahs) * (first.endPage - first.startPage + 1)));
    for (let s = startSurah + 1; s < endSurah; s++) { const su = QURAN_PAGES[s]; if (su) pages += su.endPage - su.startPage + 1; }
    const last = QURAN_PAGES[endSurah];
    if (last) pages += Math.max(1, Math.round((parseInt(endVerse) / last.ayahs) * (last.endPage - last.startPage + 1)));
    return pages;
}

// ============================================================
// LOAD DATA & INIT
// ============================================================
async function loadQuranData() {
    if (!checkAuth()) return;
    await updateDateDisplay();
    try { const r = await fetch('https://api.alquran.cloud/v1/surah'); surahsData = (await r.json()).data; initApp(); } 
    catch (e) { alert('خطأ في تحميل بيانات السور. تأكد من الاتصال.'); }
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
let rabtCounter = 0;

function loadStudent(studentNum) {
    const sid = `${currentSection}-${studentNum}`;
    const saved = localStorage.getItem(`quran_${sid}`);
    let data = { name: `طالب ${studentNum}`, attendance: 'حاضر', hasQuran: false, hasUniform: false, points: 0 };
    
    if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            data = { ...data, ...parsed };
            if (!data.name || data.name === '') data.name = `طالب ${studentNum}`;
        } catch(e) {}
    }
    
    currentAttendance = data.attendance || 'حاضر';
    
    const surahOptions = surahsData.map(s => `<option value="${s.number}">${s.name}</option>`).join('');
    const container = document.getElementById('studentCardContainer');
    
    container.innerHTML = `
        <div class="student-card">
            <div class="card-header">
                <div class="student-number">${studentNum}</div>
                <input type="text" id="studentName" class="student-name-input" value="${data.name.replace(/"/g, '&quot;')}" placeholder="اسم الطالب">
            </div>
            <div class="task-section"><div class="task-header task-header-hifz">🔰 حفظ</div><div class="task-body"><div class="range-input"><select id="hifzStartSurah" class="range-select" onchange="updateStartVerses('hifz')">${surahOptions}</select><select id="hifzStartVerse" class="verse-select"><option value="">من</option></select></div><div class="range-input"><span class="arrow">⬇</span></div><div class="range-input"><select id="hifzEndSurah" class="range-select" onchange="updateEndVerses('hifz')">${surahOptions}</select><select id="hifzEndVerse" class="verse-select"><option value="">إلى</option></select></div></div></div>
            <div class="task-section"><div class="task-header task-header-rabt">🔗 ربط</div><div class="task-body"><div id="rabtContainer" class="rabt-list"></div><button class="add-btn" onclick="addRabtItem()">➕ إضافة سورة</button></div></div>
            <div class="task-section"><div class="task-header task-header-murajaa">📖 مراجعة</div><div class="task-body"><div class="range-input"><select id="murajaaStartSurah" class="range-select" onchange="updateStartVerses('murajaa')">${surahOptions}</select><select id="murajaaStartVerse" class="verse-select"><option value="">من</option></select></div><div class="range-input"><span class="arrow">⬇</span></div><div class="range-input"><select id="murajaaEndSurah" class="range-select" onchange="updateEndVerses('murajaa')">${surahOptions}</select><select id="murajaaEndVerse" class="verse-select"><option value="">إلى</option></select></div></div></div>
            <div class="attendance-row"><button class="attendance-btn ${currentAttendance === 'حاضر' ? 'active' : ''}" onclick="setAttendance('حاضر')">✅ حاضر</button><button class="attendance-btn ${currentAttendance === 'غائب' ? 'active' : ''}" onclick="setAttendance('غائب')">❌ غائب</button><button class="attendance-btn ${currentAttendance === 'معذور' ? 'active' : ''}" onclick="setAttendance('معذور')">⚠️ معذور</button></div>
            <div class="checks-row"><label class="check-item"><input type="checkbox" id="quranCheck" ${data.hasQuran ? 'checked' : ''}> 📚 مصحف</label><label class="check-item"><input type="checkbox" id="uniformCheck" ${data.hasUniform ? 'checked' : ''}> 👕 زي</label></div>
            <div class="points-row"><span class="points-label">⭐ نقاط</span><input type="number" id="pointsInput" class="points-input" min="0" max="100" value="${data.points || 0}"></div>
            <button class="save-btn" onclick="saveCurrentStudent()">💾 حفظ</button>
        </div>
    `;
    
    rabtCounter = 0;
    document.getElementById('rabtContainer').innerHTML = '';
    if (data.rabt && data.rabt.length > 0) { data.rabt.forEach(r => addRabtItem(r)); } 
    else { addRabtItem(); }
    
    if (data.hifz) {
        setTimeout(() => {
            document.getElementById('hifzStartSurah').value = data.hifz.startSurah; updateStartVerses('hifz');
            setTimeout(() => {
                document.getElementById('hifzStartVerse').value = data.hifz.startVerse;
                document.getElementById('hifzEndSurah').value = data.hifz.endSurah; updateEndVerses('hifz');
                setTimeout(() => document.getElementById('hifzEndVerse').value = data.hifz.endVerse, 30);
            }, 30);
        }, 30);
    }
    if (data.murajaa) {
        setTimeout(() => {
            document.getElementById('murajaaStartSurah').value = data.murajaa.startSurah; updateStartVerses('murajaa');
            setTimeout(() => {
                document.getElementById('murajaaStartVerse').value = data.murajaa.startVerse;
                document.getElementById('murajaaEndSurah').value = data.murajaa.endSurah; updateEndVerses('murajaa');
                setTimeout(() => document.getElementById('murajaaEndVerse').value = data.murajaa.endVerse, 30);
            }, 30);
        }, 30);
    }
}

function addRabtItem(existing = null) {
    const container = document.getElementById('rabtContainer');
    const id = `rabt-${Date.now()}-${rabtCounter++}`;
    const surahOptions = surahsData.map(s => `<option value="${s.number}">${s.name}</option>`).join('');
    const div = document.createElement('div'); div.className = 'rabt-item'; div.id = id;
    div.innerHTML = `<div style="display: flex; justify-content: flex-end; margin-bottom: 8px;"><button class="remove-btn" onclick="this.closest('.rabt-item').remove()">✖ حذف</button></div><div class="range-input"><select class="range-select rabt-start-surah" onchange="updateRabtStartVerses('${id}')">${surahOptions}</select><select class="verse-select rabt-start-verse"><option value="">من</option></select></div><div class="range-input"><span class="arrow">⬇</span></div><div class="range-input"><select class="range-select rabt-end-surah" onchange="updateRabtEndVerses('${id}')">${surahOptions}</select><select class="verse-select rabt-end-verse"><option value="">إلى</option></select></div>`;
    container.appendChild(div);
    if (existing) {
        setTimeout(() => {
            const item = document.getElementById(id);
            item.querySelector('.rabt-start-surah').value = existing.startSurah; updateRabtStartVerses(id);
            setTimeout(() => {
                item.querySelector('.rabt-start-verse').value = existing.startVerse;
                item.querySelector('.rabt-end-surah').value = existing.endSurah; updateRabtEndVerses(id);
                setTimeout(() => item.querySelector('.rabt-end-verse').value = existing.endVerse, 30);
            }, 30);
        }, 30);
    }
}

function updateVerseOptions(surahNum, selectEl, placeholder) {
    if (!surahNum) { selectEl.innerHTML = `<option value="">${placeholder}</option>`; return; }
    const surah = surahsData.find(s => s.number == surahNum);
    if (surah) { let o = `<option value="">${placeholder}</option>`; for (let i=1; i<=surah.numberOfAyahs; i++) o += `<option value="${i}">${i}</option>`; selectEl.innerHTML = o; }
}
function updateStartVerses(task) { const s = document.getElementById(`${task}StartSurah`).value; updateVerseOptions(s, document.getElementById(`${task}StartVerse`), 'من'); }
function updateEndVerses(task) { const s = document.getElementById(`${task}EndSurah`).value; updateVerseOptions(s, document.getElementById(`${task}EndVerse`), 'إلى'); }
function updateRabtStartVerses(id) { const s = document.querySelector(`#${id} .rabt-start-surah`).value; updateVerseOptions(s, document.querySelector(`#${id} .rabt-start-verse`), 'من'); }
function updateRabtEndVerses(id) { const s = document.querySelector(`#${id} .rabt-end-surah`).value; updateVerseOptions(s, document.querySelector(`#${id} .rabt-end-verse`), 'إلى'); }
function setAttendance(val) { currentAttendance = val; document.querySelectorAll('.attendance-btn').forEach(b => { b.classList.toggle('active', b.textContent.includes(val)); }); }

function saveCurrentStudent() {
    const studentNum = currentStudentIndex + 1;
    const sid = `${currentSection}-${studentNum}`;
    const nameInput = document.getElementById('studentName');
    const name = nameInput ? nameInput.value.trim() : '';
    const finalName = name || `طالب ${studentNum}`;
    const quran = document.getElementById('quranCheck').checked;
    const uniform = document.getElementById('uniformCheck').checked;
    const points = document.getElementById('pointsInput').value || 0;
    
    let hifz = null, murajaa = null;
    const rabt = [];
    
    const hs = document.getElementById('hifzStartSurah')?.value, hsv = document.getElementById('hifzStartVerse')?.value;
    const he = document.getElementById('hifzEndSurah')?.value, hev = document.getElementById('hifzEndVerse')?.value;
    if (hs && hsv && he && hev) hifz = { startSurah: hs, startVerse: hsv, endSurah: he, endVerse: hev, startSurahName: surahsData.find(s => s.number == hs)?.name || '', endSurahName: surahsData.find(s => s.number == he)?.name || '', pages: calculatePages(hs, hsv, he, hev) };
    
    const ms = document.getElementById('murajaaStartSurah')?.value, msv = document.getElementById('murajaaStartVerse')?.value;
    const me = document.getElementById('murajaaEndSurah')?.value, mev = document.getElementById('murajaaEndVerse')?.value;
    if (ms && msv && me && mev) murajaa = { startSurah: ms, startVerse: msv, endSurah: me, endVerse: mev, startSurahName: surahsData.find(s => s.number == ms)?.name || '', endSurahName: surahsData.find(s => s.number == me)?.name || '', pages: calculatePages(ms, msv, me, mev) };
    
    document.querySelectorAll('.rabt-item').forEach(item => {
        const ss = item.querySelector('.rabt-start-surah')?.value, sv = item.querySelector('.rabt-start-verse')?.value;
        const es = item.querySelector('.rabt-end-surah')?.value, ev = item.querySelector('.rabt-end-verse')?.value;
        if (ss && sv && es && ev) rabt.push({ startSurah: ss, startVerse: sv, endSurah: es, endVerse: ev, startSurahName: surahsData.find(s => s.number == ss)?.name || '', endSurahName: surahsData.find(s => s.number == es)?.name || '', pages: calculatePages(ss, sv, es, ev) });
    });
    
    const data = { name: finalName, section: currentSection, attendance: currentAttendance, hasQuran: quran, hasUniform: uniform, points, hifz, rabt, murajaa, savedAt: new Date().toISOString() };
    localStorage.setItem(`quran_${sid}`, JSON.stringify(data));
    updateStudentDropdown();
    const btn = event.target; btn.textContent = '✅ تم الحفظ!'; setTimeout(() => btn.textContent = '💾 حفظ', 1500);
}

// ============================================================
// NAVIGATION
// ============================================================
function switchSection(section) {
    currentSection = section;
    document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', ['highschool','middleschool','elementary','reports'][i] === section));
    const isReports = section === 'reports';
    document.getElementById('trackerView').classList.toggle('hidden', isReports);
    document.getElementById('reportsView').classList.toggle('hidden', !isReports);
    if (!isReports) { loadStudentCounts(); currentStudentIndex = 0; updateStudentDropdown(); loadStudent(1); } 
    else { loadReportsData(); loadDailyReport(); }
}
function updateStudentDropdown() {
    const select = document.getElementById('studentJumpSelect'); select.innerHTML = '';
    for (let i = 1; i <= totalStudents; i++) { 
        const saved = localStorage.getItem(`quran_${currentSection}-${i}`); 
        let name = `طالب ${i}`; 
        if (saved) { try { const d = JSON.parse(saved); if (d.name) name = d.name; } catch(e) {} } 
        select.innerHTML += `<option value="${i}">${i} - ${name}</option>`; 
    }
    select.value = currentStudentIndex + 1;
}
function prevStudent() { if (currentStudentIndex > 0) { currentStudentIndex--; loadStudent(currentStudentIndex + 1); updateStudentDropdown(); } }
function nextStudent() { if (currentStudentIndex < totalStudents - 1) { currentStudentIndex++; loadStudent(currentStudentIndex + 1); updateStudentDropdown(); } }
function jumpToStudent() { currentStudentIndex = parseInt(document.getElementById('studentJumpSelect').value) - 1; loadStudent(currentStudentIndex + 1); }

// ============================================================
// REPORTS
// ============================================================
function changeMonth(d) { currentReportMonth.setMonth(currentReportMonth.getMonth() + d); loadReportsData(); }
function changeDate(d) { const dt = new Date(currentReportDate); dt.setDate(dt.getDate() + d); currentReportDate = dt.toISOString().split('T')[0]; document.getElementById('currentDateDisplay').textContent = new Date(currentReportDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); loadDailyReport(); }
function loadReportsData() {
    const y = currentReportMonth.getFullYear(), m = currentReportMonth.getMonth();
    document.getElementById('currentMonthDisplay').textContent = `${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][m]} ${y}`;
    const data = { highschool: { hifz:0, rabt:0, murajaa:0 }, middleschool: { hifz:0, rabt:0, murajaa:0 }, elementary: { hifz:0, rabt:0, murajaa:0 } };
    for (let i=0; i<localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('quran_')) { try { const d = JSON.parse(localStorage.getItem(k)); if (d?.savedAt && new Date(d.savedAt).getFullYear()===y && new Date(d.savedAt).getMonth()===m) { if (d.section && data[d.section]) { if (d.hifz?.pages) data[d.section].hifz += d.hifz.pages; if (d.rabt) d.rabt.forEach(r => { if (r.pages) data[d.section].rabt += r.pages; }); if (d.murajaa?.pages) data[d.section].murajaa += d.murajaa.pages; } } } catch (e) {} } }
    ['highschool','middleschool','elementary'].forEach(s => { const d = data[s]; const tot = d.hifz + d.rabt + d.murajaa; document.getElementById(`${s}-summary`).innerHTML = `<table class="summary-table"><tr><th>المهمة</th><th>الصفحات</th><th>الختمات</th></tr><tr><td>📖 حفظ</td><td>${d.hifz}</td><td>${(d.hifz/TOTAL_QURAN_PAGES).toFixed(2)}</td></tr><tr><td>🔗 ربط</td><td>${d.rabt}</td><td>${(d.rabt/TOTAL_QURAN_PAGES).toFixed(2)}</td></tr><tr><td>📚 مراجعة</td><td>${d.murajaa}</td><td>${(d.murajaa/TOTAL_QURAN_PAGES).toFixed(2)}</td></tr><tr class="total-row"><td>📄 المجموع</td><td>${tot}</td><td>${(tot/TOTAL_QURAN_PAGES).toFixed(2)}</td></tr></table>`; });
    const tot = { hifz: data.highschool.hifz+data.middleschool.hifz+data.elementary.hifz, rabt: data.highschool.rabt+data.middleschool.rabt+data.elementary.rabt, murajaa: data.highschool.murajaa+data.middleschool.murajaa+data.elementary.murajaa };
    const all = tot.hifz + tot.rabt + tot.murajaa;
    document.getElementById('grand-total-pages').textContent = all; document.getElementById('grand-total-khatmah').textContent = (all / TOTAL_QURAN_PAGES).toFixed(2);
}
function loadDailyReport() {
    document.getElementById('currentDateDisplay').textContent = new Date(currentReportDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    ['highschool','middleschool','elementary'].forEach(s => {
        const c = document.getElementById(`daily-${s}`); const st = [];
        for (let i=0; i<localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(`quran_${s}-`)) { try { const d = JSON.parse(localStorage.getItem(k)); if (d?.savedAt && new Date(d.savedAt).toISOString().split('T')[0] === currentReportDate) st.push(d); } catch (e) {} } }
        if (st.length===0) { c.innerHTML = '<div class="no-data">لا توجد بيانات لهذا اليوم</div>'; return; }
        let h = '<table class="summary-table"><tr><th>#</th><th>الطالب</th><th>الحضور</th><th>حفظ</th><th>ربط</th><th>مراجعة</th><th>مصحف</th><th>زي</th><th>نقاط</th></tr>';
        st.forEach((d, idx) => { const hifzText = d.hifz ? `${d.hifz.startSurahName||''} ${d.hifz.startVerse} → ${d.hifz.endSurahName||''} ${d.hifz.endVerse}` : '-'; const rabtText = d.rabt?.length ? d.rabt.map(r => `${r.startSurahName||''} ${r.startVerse} → ${r.endSurahName||''} ${r.endVerse}`).join('، ') : '-'; const murajaaText = d.murajaa ? `${d.murajaa.startSurahName||''} ${d.murajaa.startVerse} → ${d.murajaa.endSurahName||''} ${d.murajaa.endVerse}` : '-'; h += `<tr><td>${idx+1}</td><td>${d.name||'-'}</td><td>${d.attendance||'-'}</td><td>${hifzText}</td><td>${rabtText}</td><td>${murajaaText}</td><td>${d.hasQuran?'✅':'❌'}</td><td>${d.hasUniform?'✅':'❌'}</td><td>${d.points||0}</td></tr>`; });
        c.innerHTML = h + '</table>';
    });
}

// ============================================================
// PDF EXPORT
// ============================================================
function downloadAsPDF(el, fname, title) {
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const gDate = getGregorianDate(), hDate = document.getElementById('hijriDate').textContent;
    const wrap = document.createElement('div'); wrap.style.cssText = 'padding:20px;background:white;font-family:"Cairo","Arial",sans-serif;direction:rtl;text-align:right;width:800px;unicode-bidi:embed;'; wrap.setAttribute('dir', 'rtl'); wrap.setAttribute('lang', 'ar');
    const content = el.cloneNode(true); content.style.cssText = 'font-family:"Cairo","Arial",sans-serif;direction:rtl;text-align:right;'; content.setAttribute('dir', 'rtl');
    content.querySelectorAll('td, th').forEach(cell => { cell.style.textAlign = 'right'; cell.style.direction = 'rtl'; });
    wrap.innerHTML = `<h1 style="color:#065f46;text-align:center;margin-bottom:10px;font-family:'Cairo','Arial',sans-serif;direction:rtl;">${title}</h1><div style="text-align:center;margin-bottom:20px;font-family:'Cairo','Arial',sans-serif;direction:rtl;"><span>📅 ${hDate}</span> &nbsp;|&nbsp; <span>📆 ${gDate}</span></div>`;
    wrap.appendChild(content); document.body.appendChild(wrap);
    html2canvas(wrap, { scale: 2.5, backgroundColor: '#ffffff', allowTaint: false, useCORS: true, logging: false }).then(canvas => {
        const imgData = canvas.toDataURL('image/png'), pdfWidth = doc.internal.pageSize.getWidth(), pdfHeight = doc.internal.pageSize.getHeight();
        const imgWidth = canvas.width, imgHeight = canvas.height, ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        let heightLeft = imgHeight * ratio, position = 0;
        doc.addImage(imgData, 'PNG', (pdfWidth - imgWidth * ratio) / 2, position, imgWidth * ratio, imgHeight * ratio); heightLeft -= pdfHeight;
        while (heightLeft > 0) { position = heightLeft - imgHeight * ratio; doc.addPage(); doc.addImage(imgData, 'PNG', (pdfWidth - imgWidth * ratio) / 2, position, imgWidth * ratio, imgHeight * ratio); heightLeft -= pdfHeight; }
        doc.save(fname); document.body.removeChild(wrap);
    }).catch(e => { document.body.removeChild(wrap); alert('خطأ في إنشاء PDF'); });
}
function exportDailyReport(l) { const el = document.getElementById(`daily-${l}`); if (!el || el.querySelector('.no-data')) { alert('لا توجد بيانات للتصدير'); return; } downloadAsPDF(el, `تقرير_${SECTION_NAMES[l]}_${currentReportDate}.pdf`, `تقرير ${SECTION_NAMES[l]} اليومي`); }
function exportMonthlyReport(l) { downloadAsPDF(document.getElementById(`${l}-summary`), `تقرير_${SECTION_NAMES[l]}_${currentReportMonth.getMonth()+1}-${currentReportMonth.getFullYear()}.pdf`, `تقرير ${SECTION_NAMES[l]} الشهري`); }
function exportGrandTotal() {
    const w = document.createElement('div'); w.innerHTML = `<h2>🏫 الثانوي</h2>${document.getElementById('highschool-summary').innerHTML}<h2>🏫 المتوسط</h2>${document.getElementById('middleschool-summary').innerHTML}<h2>🏫 الابتدائي</h2>${document.getElementById('elementary-summary').innerHTML}<div style="background:#059669;color:white;padding:20px;border-radius:20px;margin-top:20px;text-align:center;"><h2>🎯 إجمالي الختمات</h2><div style="font-size:40px;">${document.getElementById('grand-total-khatmah').textContent} ختمة</div></div>`;
    downloadAsPDF(w, `التقرير_الشامل_${currentReportMonth.getMonth()+1}-${currentReportMonth.getFullYear()}.pdf`, 'التقرير الشامل');
}

// ============================================================
// ADMIN PANEL
// ============================================================
function showAdminPanel() { const p = prompt("🔐 كلمة المرور:"); if (p !== ADMIN_PASSWORD) { alert("❌ خطأ"); return; } const s = prompt("1- ثانوي\n2- متوسط\n3- ابتدائي\n4- حذف الكل"); if (s==='4') { resetAllData(); return; } let sec; if (s==='1') sec='highschool'; else if (s==='2') sec='middleschool'; else if (s==='3') sec='elementary'; else return; const a = prompt("1- إضافة\n2- حذف"); if (a==='1') addNewStudent(sec); else if (a==='2') deleteStudent(sec); }
function addNewStudent(sec) { const cnt = parseInt(localStorage.getItem(`studentCount_${sec}`)||'50')+1; localStorage.setItem(`studentCount_${sec}`, cnt); if (sec===currentSection) { totalStudents=cnt; updateStudentDropdown(); } alert(`✅ تمت الإضافة! العدد: ${cnt}`); }
function deleteStudent(sec) { const cnt = parseInt(localStorage.getItem(`studentCount_${sec}`)||'50'); const n = parseInt(prompt(`رقم الطالب (1-${cnt}):`)); if (isNaN(n)||n<1||n>cnt) return; if (!confirm(`حذف ${n}؟`)) return; localStorage.removeItem(`quran_${sec}-${n}`); for (let i=n; i<cnt; i++) { const old=localStorage.getItem(`quran_${sec}-${i+1}`); if (old) { localStorage.setItem(`quran_${sec}-${i}`, old); localStorage.removeItem(`quran_${sec}-${i+1}`); } } localStorage.setItem(`studentCount_${sec}`, cnt-1); if (sec===currentSection) { totalStudents=cnt-1; if (currentStudentIndex>=totalStudents) currentStudentIndex=Math.max(0,totalStudents-1); loadStudent(currentStudentIndex+1); updateStudentDropdown(); } alert(`✅ تم الحذف`); }
function resetAllData() { if (!confirm("⚠️ حذف جميع البيانات؟")) return; if (prompt("اكتب: حذف جميع البيانات")!=="حذف جميع البيانات") return; for (let i=localStorage.length-1; i>=0; i--) { const k=localStorage.key(i); if (k.startsWith('quran_')) localStorage.removeItem(k); } localStorage.setItem('studentCount_highschool','50'); localStorage.setItem('studentCount_middleschool','50'); localStorage.setItem('studentCount_elementary','50'); alert("✅ تم الحذف"); location.reload(); }

window.onload = loadQuranData;