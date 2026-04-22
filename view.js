// ============================================================
// VIEW.JS - Read-Only Section View
// ============================================================

// Supabase Configuration (same as tracker.js)
const SUPABASE_URL = "https://dklyyzbnapkxlluximzk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrbHl5emJuYXBreGxsdXhpbXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjEwMDIsImV4cCI6MjA5MTgzNzAwMn0.qpCqvUTia4ywEMPSYJ_rIB4pSlk0zkvq5cQa-sFaFEs";
const SUPABASE_TABLE = "quran_data";
const SUPABASE_ENABLED = true;

// Section data
let currentSection = 'highschool';
let sectionName = 'ثانوي';
let currentViewDate = new Date();
let currentViewWeek = new Date();
let currentViewMonth = new Date();

// Section names mapping
const SECTION_NAMES = { 
    highschool: 'قسم الثانوي ', 
    middleschool: ' قسم المتوسط', 
    elementary: ' قسم الابتدائي' 
};

// Check auth and get section from session
function checkAuth() {
    const session = sessionStorage.getItem('viewSectionSession');
    if (!session) { 
        window.location.href = 'login.html'; 
        return false; 
    }
    try {
        const data = JSON.parse(session);
        currentSection = data.section;
        sectionName = SECTION_NAMES[currentSection] || currentSection;
        document.getElementById('sectionDisplay').textContent = `مرحباً، المرحلة ${sectionName}`;
        
      
        
        return true;
    } catch (e) { 
        sessionStorage.removeItem('viewSectionSession'); 
        window.location.href = 'login.html'; 
        return false; 
    }
}

function logout() { 
    if (confirm('تسجيل الخروج؟')) { 
        sessionStorage.removeItem('viewSectionSession'); 
        window.location.href = 'login.html'; 
    } 
}

// Date functions
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
        return "جاري التحميل...";
    } catch (e) {
        return "جاري التحميل...";
    }
}

async function updateDateDisplay() { 
    document.getElementById('gregorianDate').textContent = getGregorianDate(); 
    document.getElementById('hijriDate').textContent = await getHijriDate(); 
}

// Load from cloud
async function loadFromCloud() {
    if (!SUPABASE_ENABLED) return false;
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?key=eq.main_data&select=value`,
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
            const keysToDelete = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('quran_') || key.startsWith('studentCount_')) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => localStorage.removeItem(key));
            for (const key in cloudData) {
                localStorage.setItem(key, cloudData[key]);
            }
            console.log('✅ Loaded from Supabase');
            return true;
        }
        return false;
    } catch (e) {
        console.error('Load error:', e);
        return false;
    }
}

// Tab Switching
function switchViewTab(tab) {
    document.getElementById('dailyTab').classList.remove('active');
    document.getElementById('pointsTab').classList.remove('active');
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    
    if (tab === 'daily') {
        document.getElementById('dailyTab').classList.add('active');
        document.querySelectorAll('.view-tab')[0].classList.add('active');
        loadDailyReport();
    } else {
        document.getElementById('pointsTab').classList.add('active');
        document.querySelectorAll('.view-tab')[1].classList.add('active');
        loadWeeklyPoints();
    }
}

function switchPointsSubtab(period) {
    document.getElementById('viewWeeklyPoints').classList.add('hidden');
    document.getElementById('viewMonthlyPoints').classList.add('hidden');
    document.getElementById('viewAllTimePoints').classList.add('hidden');
    document.querySelectorAll('.points-subtab').forEach(t => t.classList.remove('active'));
    
    if (period === 'weekly') {
        document.getElementById('viewWeeklyPoints').classList.remove('hidden');
        document.querySelectorAll('.points-subtab')[0].classList.add('active');
        loadWeeklyPoints();
    } else if (period === 'monthly') {
        document.getElementById('viewMonthlyPoints').classList.remove('hidden');
        document.querySelectorAll('.points-subtab')[1].classList.add('active');
        loadMonthlyPoints();
    } else {
        document.getElementById('viewAllTimePoints').classList.remove('hidden');
        document.querySelectorAll('.points-subtab')[2].classList.add('active');
        loadAllTimePoints();
    }
}

// Daily Report Functions
function changeViewDate(delta) {
    currentViewDate.setDate(currentViewDate.getDate() + delta);
    updateViewDateDisplay();
    loadDailyReport();
}

function updateViewDateDisplay() {
    const display = document.getElementById('viewDateDisplay');
    if (display) {
        display.textContent = currentViewDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    }
}

function loadDailyReport() {
    updateViewDateDisplay();
    const dateStr = currentViewDate.toISOString().split('T')[0];
    const container = document.getElementById('viewDailyContent');
    
    const students = [];
    const count = parseInt(localStorage.getItem(`studentCount_${currentSection}`) || '50');
    
    for (let i = 1; i <= count; i++) {
        const key = `quran_${currentSection}-${i}`;
        const saved = localStorage.getItem(key);
        
        let studentData = { 
            number: i, 
            name: `طالب ${i}`, 
            attendance: '-',
            hifz: '-', 
            rabt: '-', 
            murajaa: '-',
            hasData: false
        };
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.name) studentData.name = data.name;
                if (data.savedAt && data.savedAt.split('T')[0] === dateStr) {
                    studentData.hasData = true;
                    studentData.attendance = data.attendance || '-';
                    if (data.hifz) {
                        studentData.hifz = `${data.hifz.startSurahName || ''} ${data.hifz.startVerse}-${data.hifz.endVerse}`;
                    }
                    if (data.rabt && data.rabt.length > 0) {
                        studentData.rabt = data.rabt.map(r => `${r.startSurahName || ''} ${r.startVerse}-${r.endVerse}`).join('، ');
                    }
                    if (data.murajaa) {
                        studentData.murajaa = `${data.murajaa.startSurahName || ''} ${data.murajaa.startVerse}-${data.murajaa.endVerse}`;
                    }
                }
            } catch (e) {}
        }
        students.push(studentData);
    }
    
    // Store for search filtering
    window.currentDailyStudents = students;
    
    renderDailyTable(students);
}

function renderDailyTable(students) {
    const container = document.getElementById('viewDailyContent');
    
    if (students.length === 0) {
        container.innerHTML = '<div class="no-data">لا توجد بيانات</div>';
        return;
    }
    
    let html = '<table class="view-table" id="dailyTable">';
    html += '<thead><tr><th>#</th><th>الطالب</th><th>الحضور</th><th>حفظ</th><th>ربط</th><th>مراجعة</th></tr></thead><tbody>';
    
    students.forEach((s, idx) => {
        let attendanceHtml = '-';
        if (s.attendance === 'حاضر') attendanceHtml = '<span class="attendance-badge attendance-present">✅ حاضر</span>';
        else if (s.attendance === 'متأخر') attendanceHtml = '<span class="attendance-badge attendance-late">🕐 متأخر</span>';
        else if (s.attendance === 'غائب') attendanceHtml = '<span class="attendance-badge attendance-absent">❌ غائب</span>';
        else if (s.attendance === 'معذور') attendanceHtml = '<span class="attendance-badge attendance-excused">⚠️ معذور</span>';
        
        html += `<tr class="student-row" data-student-name="${s.name}">`;
        html += `<td>${idx + 1}</td>`;
        html += `<td class="student-name">${s.name}</td>`;
        html += `<td>${attendanceHtml}</td>`;
        html += `<td>${s.hifz || '-'}</td>`;
        html += `<td>${s.rabt || '-'}</td>`;
        html += `<td>${s.murajaa || '-'}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    updateDailyResultCount(students.length, students.length);
}

function filterDailyTable() {
    const searchInput = document.getElementById('dailySearchInput');
    const searchTerm = searchInput.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#dailyTable .student-row');
    
    let visibleCount = 0;
    rows.forEach(row => {
        const studentName = row.getAttribute('data-student-name').toLowerCase();
        if (studentName.includes(searchTerm)) {
            row.classList.remove('hidden-by-search');
            visibleCount++;
        } else {
            row.classList.add('hidden-by-search');
        }
    });
    
    updateDailyResultCount(visibleCount, rows.length);
}

function updateDailyResultCount(visible, total) {
    const countEl = document.getElementById('dailyResultCount');
    if (countEl) {
        countEl.textContent = `عرض ${visible} من ${total} طالب`;
    }
}

// Weekly Points Functions
function changeViewWeek(delta) {
    currentViewWeek.setDate(currentViewWeek.getDate() + (delta * 7));
    updateViewWeekDisplay();
    loadWeeklyPoints();
}

function updateViewWeekDisplay() {
    const weekStart = new Date(currentViewWeek);
    weekStart.setDate(currentViewWeek.getDate() - currentViewWeek.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthName = months[weekStart.getMonth()];
    const firstDayOfMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
    const weekNumber = Math.ceil((weekStart.getDate() + firstDayOfMonth.getDay()) / 7);
    
    const display = document.getElementById('viewWeekDisplay');
    if (display) {
        display.textContent = `${monthName} - الأسبوع ${weekNumber} (${weekStart.getDate()}/${weekStart.getMonth()+1} - ${weekEnd.getDate()}/${weekEnd.getMonth()+1})`;
    }
}

function loadWeeklyPoints() {
    updateViewWeekDisplay();
    
    const weekStart = new Date(currentViewWeek);
    weekStart.setDate(currentViewWeek.getDate() - currentViewWeek.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const students = [];
    const count = parseInt(localStorage.getItem(`studentCount_${currentSection}`) || '50');
    
    for (let i = 1; i <= count; i++) {
        const key = `quran_${currentSection}-${i}`;
        const saved = localStorage.getItem(key);
        
        let name = `طالب ${i}`;
        let points = 0;
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.name) name = data.name;
                if (data.savedAt) {
                    const savedDate = new Date(data.savedAt);
                    if (savedDate >= weekStart && savedDate <= weekEnd) {
                        points = parseInt(data.points) || 0;
                    }
                }
            } catch (e) {}
        }
        students.push({ number: i, name: name, points: points });
    }
    
    students.sort((a, b) => b.points - a.points);
    window.currentWeeklyStudents = students;
    renderPointsTable('viewWeeklyContent', students, 'weekly');
}

// Monthly Points Functions
function changeViewMonth(delta) {
    currentViewMonth.setMonth(currentViewMonth.getMonth() + delta);
    updateViewMonthDisplay();
    loadMonthlyPoints();
}

function updateViewMonthDisplay() {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const display = document.getElementById('viewMonthDisplay');
    if (display) {
        display.textContent = `${months[currentViewMonth.getMonth()]} ${currentViewMonth.getFullYear()}`;
    }
}

function loadMonthlyPoints() {
    updateViewMonthDisplay();
    
    const year = currentViewMonth.getFullYear();
    const month = currentViewMonth.getMonth();
    
    const students = [];
    const count = parseInt(localStorage.getItem(`studentCount_${currentSection}`) || '50');
    
    for (let i = 1; i <= count; i++) {
        const key = `quran_${currentSection}-${i}`;
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
            } catch (e) {}
        }
        students.push({ number: i, name: name, points: points });
    }
    
    students.sort((a, b) => b.points - a.points);
    window.currentMonthlyStudents = students;
    renderPointsTable('viewMonthlyContent', students, 'monthly');
}

// All-Time Points Functions
function loadAllTimePoints() {
    const students = [];
    const count = parseInt(localStorage.getItem(`studentCount_${currentSection}`) || '50');
    
    for (let i = 1; i <= count; i++) {
        const key = `quran_${currentSection}-${i}`;
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
    window.currentAllTimeStudents = students;
    renderPointsTable('viewAllTimeContent', students, 'alltime');
}

function renderPointsTable(containerId, students, type) {
    const container = document.getElementById(containerId);
    
    if (students.length === 0) {
        container.innerHTML = '<div class="no-data">لا توجد نقاط</div>';
        return;
    }
    
    const tableId = `pointsTable-${type}`;
    let html = `<table class="view-table" id="${tableId}">`;
    html += '<thead><tr><th>#</th><th>الطالب</th><th>النقاط</th></tr></thead><tbody>';
    
    students.forEach((s, idx) => {
        html += `<tr class="student-row" data-student-name="${s.name}">`;
        html += `<td>${idx + 1}</td>`;
        html += `<td class="student-name">${s.name}</td>`;
        html += `<td class="points-value">${s.points}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    if (type === 'weekly') {
        updatePointsResultCount('weekly', students.length, students.length);
    } else if (type === 'monthly') {
        updatePointsResultCount('monthly', students.length, students.length);
    } else {
        updatePointsResultCount('alltime', students.length, students.length);
    }
}

function filterPointsTable(type) {
    const searchInput = document.getElementById(`${type}SearchInput`);
    const searchTerm = searchInput.value.toLowerCase().trim();
    const tableId = `pointsTable-${type}`;
    const rows = document.querySelectorAll(`#${tableId} .student-row`);
    
    let visibleCount = 0;
    rows.forEach(row => {
        const studentName = row.getAttribute('data-student-name').toLowerCase();
        if (studentName.includes(searchTerm)) {
            row.classList.remove('hidden-by-search');
            visibleCount++;
        } else {
            row.classList.add('hidden-by-search');
        }
    });
    
    updatePointsResultCount(type, visibleCount, rows.length);
}

function updatePointsResultCount(type, visible, total) {
    const countEl = document.getElementById(`${type}ResultCount`);
    if (countEl) {
        countEl.textContent = `عرض ${visible} من ${total} طالب`;
    }
}

// ============================================================
// REAL-TIME SYNC FOR VIEW PAGE
// ============================================================
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
let realtimeChannel = null;

async function subscribeToRealtimeChanges() {
    if (!SUPABASE_ENABLED || !supabaseClient) {
        console.log('⚠️ Realtime sync disabled');
        return;
    }
    
    if (realtimeChannel) {
        await realtimeChannel.unsubscribe();
    }
    
    realtimeChannel = supabaseClient
        .channel('view-page-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: SUPABASE_TABLE
            },
            (payload) => {
                console.log('🔄 Data changed by teacher!');
                
                if (document.hidden) {
                    window.needsReload = true;
                } else {
                    refreshViewData();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ View page connected to real-time sync');
            }
        });
}

async function refreshViewData() {
    console.log('🔄 Refreshing view data...');
    
    await loadFromCloud();
    
    // Refresh current tab
    const dailyTab = document.getElementById('dailyTab');
    if (dailyTab && dailyTab.classList.contains('active')) {
        loadDailyReport();
    } else {
        const weeklyPane = document.getElementById('viewWeeklyPoints');
        if (weeklyPane && !weeklyPane.classList.contains('hidden')) {
            loadWeeklyPoints();
        } else {
            const monthlyPane = document.getElementById('viewMonthlyPoints');
            if (monthlyPane && !monthlyPane.classList.contains('hidden')) {
                loadMonthlyPoints();
            } else {
                loadAllTimePoints();
            }
        }
    }
    
    console.log('✅ View data refreshed');
}

document.addEventListener('visibilitychange', function() {
    if (!document.hidden && window.needsReload) {
        window.needsReload = false;
        console.log('🔄 Reloading view after tab became active');
        refreshViewData();
    }
});
// Initialize
async function init() {
    if (!checkAuth()) return;
    await updateDateDisplay();
    await loadFromCloud();
    await subscribeToRealtimeChanges();  // ADD THIS LINE
    
    updateViewDateDisplay();
    updateViewWeekDisplay();
    updateViewMonthDisplay();
    
    loadDailyReport();
}

window.onload = init;
