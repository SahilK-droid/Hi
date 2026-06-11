// Tab Navigation
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        navBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(tab).classList.add('active');
    });
});

// ========== POMODORO TIMER ==========
let timerInterval = null;
let timeLeft = 25 * 60;
let isWorkSession = true;
let isRunning = false;

const timerDisplay = document.getElementById('timer');
const sessionType = document.getElementById('sessionType');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const workTimeInput = document.getElementById('workTime');
const breakTimeInput = document.getElementById('breakTime');

// Statistics elements
const totalSessionsEl = document.getElementById('totalSessions');
const totalMinutesEl = document.getElementById('totalMinutes');
const todaySessionsEl = document.getElementById('todaySessions');
const streakEl = document.getElementById('streak');
const resetStatsBtn = document.getElementById('resetStats');

// Load statistics from localStorage
let stats = JSON.parse(localStorage.getItem('pomodoroStats')) || {
    totalSessions: 0,
    totalMinutes: 0,
    todaySessions: 0,
    lastDate: null,
    streak: 0
};

function updateStatsDisplay() {
    totalSessionsEl.textContent = stats.totalSessions;
    totalMinutesEl.textContent = stats.totalMinutes;
    todaySessionsEl.textContent = stats.todaySessions;
    streakEl.textContent = stats.streak;
}

function saveStats() {
    localStorage.setItem('pomodoroStats', JSON.stringify(stats));
}

function checkDailyStreak() {
    const today = new Date().toDateString();
    if (stats.lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (stats.lastDate === yesterday.toDateString()) {
            // Continue streak
        } else if (stats.lastDate !== null) {
            // Streak broken
            stats.streak = 0;
        }
        
        stats.todaySessions = 0;
        stats.lastDate = today;
        saveStats();
    }
}

checkDailyStreak();
updateStatsDisplay();

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timeLeft);
    document.title = `${formatTime(timeLeft)} - ${isWorkSession ? 'Arbeit' : 'Pause'}`;
}

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            
            // Play notification sound
            playNotificationSound();
            
            if (isWorkSession) {
                // Work session completed
                stats.totalSessions++;
                stats.totalMinutes += parseInt(workTimeInput.value);
                stats.todaySessions++;
                
                if (stats.todaySessions === 1) {
                    stats.streak++;
                }
                
                saveStats();
                updateStatsDisplay();
                
                // Switch to break
                isWorkSession = false;
                timeLeft = parseInt(breakTimeInput.value) * 60;
                sessionType.textContent = 'Pause';
            } else {
                // Break completed
                isWorkSession = true;
                timeLeft = parseInt(workTimeInput.value) * 60;
                sessionType.textContent = 'Arbeitszeit';
            }
            
            updateTimerDisplay();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    isWorkSession = true;
    timeLeft = parseInt(workTimeInput.value) * 60;
    sessionType.textContent = 'Arbeitszeit';
    startBtn.disabled = false;
    pauseBtn.disabled = false;
    updateTimerDisplay();
    document.title = 'PWA Schultool - Pomodoro & Notenrechner';
}

function playNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

workTimeInput.addEventListener('change', () => {
    if (!isRunning && isWorkSession) {
        timeLeft = parseInt(workTimeInput.value) * 60;
        updateTimerDisplay();
    }
});

breakTimeInput.addEventListener('change', () => {
    if (!isRunning && !isWorkSession) {
        timeLeft = parseInt(breakTimeInput.value) * 60;
        updateTimerDisplay();
    }
});

resetStatsBtn.addEventListener('click', () => {
    if (confirm('Möchtest du die Statistik wirklich zurücksetzen?')) {
        stats = {
            totalSessions: 0,
            totalMinutes: 0,
            todaySessions: 0,
            lastDate: null,
            streak: 0
        };
        saveStats();
        updateStatsDisplay();
    }
});

// Initialize timer display
updateTimerDisplay();

// ========== GRADE CALCULATOR ==========
const subjectInput = document.getElementById('subject');
const gradeInput = document.getElementById('grade');
const weightInput = document.getElementById('weight');
const addGradeBtn = document.getElementById('addGrade');
const gradeList = document.getElementById('gradeList');
const averageEl = document.getElementById('average');
const gradeCountEl = document.getElementById('gradeCount');
const clearGradesBtn = document.getElementById('clearGrades');

let grades = JSON.parse(localStorage.getItem('grades')) || [];

function renderGrades() {
    gradeList.innerHTML = '';
    
    grades.forEach((grade, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${grade.subject}: ${grade.grade} (Gewichtung: ${grade.weight})</span>
            <button class="delete-btn" onclick="deleteGrade(${index})">Löschen</button>
        `;
        gradeList.appendChild(li);
    });
    
    calculateAverage();
}

function calculateAverage() {
    if (grades.length === 0) {
        averageEl.textContent = '-';
        gradeCountEl.textContent = '0';
        return;
    }
    
    let totalWeighted = 0;
    let totalWeight = 0;
    
    grades.forEach(grade => {
        const weightDecimal = grade.weight / 100; // Convert percentage to decimal
        totalWeighted += grade.grade * weightDecimal;
        totalWeight += weightDecimal;
    });
    
    const average = totalWeighted / totalWeight;
    averageEl.textContent = average.toFixed(2);
    gradeCountEl.textContent = grades.length;
    
    // Color code the average
    if (average >= 1 && average < 2) {
        averageEl.style.color = '#10B981';
    } else if (average >= 2 && average < 3) {
        averageEl.style.color = '#4F46E5';
    } else if (average >= 3 && average < 4) {
        averageEl.style.color = '#F59E0B';
    } else if (average >= 4 && average < 5) {
        averageEl.style.color = '#EF4444';
    } else {
        averageEl.style.color = '#DC2626';
    }
}

function addGrade() {
    const subject = subjectInput.value.trim();
    const grade = parseFloat(gradeInput.value);
    const weight = parseFloat(weightInput.value) / 100; // Convert percentage to decimal
    
    if (!subject || isNaN(grade) || grade < 1 || grade > 6) {
        alert('Bitte gib ein gültiges Fach und eine Note zwischen 1 und 6 ein.');
        return;
    }
    
    if (isNaN(weight) || weight < 0.01 || weight > 2) {
        alert('Bitte gib eine gültige Gewichtung zwischen 1% und 200% ein.');
        return;
    }
    
    grades.push({ subject, grade, weight: weight * 100 }); // Store as percentage for display
    localStorage.setItem('grades', JSON.stringify(grades));
    
    subjectInput.value = '';
    gradeInput.value = '';
    weightInput.value = '100';
    
    renderGrades();
}

window.deleteGrade = function(index) {
    grades.splice(index, 1);
    localStorage.setItem('grades', JSON.stringify(grades));
    renderGrades();
};

addGradeBtn.addEventListener('click', addGrade);

clearGradesBtn.addEventListener('click', () => {
    if (confirm('Möchtest du alle Noten wirklich löschen?')) {
        grades = [];
        localStorage.setItem('grades', JSON.stringify(grades));
        renderGrades();
    }
});

// Initialize grade list
renderGrades();

// ========== STUNDENPLAN ==========
const dayBtns = document.querySelectorAll('.day-btn');
const classSubjectInput = document.getElementById('classSubject');
const classTimeInput = document.getElementById('classTime');
const classRoomInput = document.getElementById('classRoom');
const addClassBtn = document.getElementById('addClass');
const classList = document.getElementById('classList');
const selectedDayTitle = document.getElementById('selectedDayTitle');
const clearScheduleBtn = document.getElementById('clearSchedule');

let selectedDay = 'montag';
let schedule = JSON.parse(localStorage.getItem('schedule')) || {
    montag: [],
    dienstag: [],
    mittwoch: [],
    donnerstag: [],
    freitag: []
};

const dayNames = {
    montag: 'Montag',
    dienstag: 'Dienstag',
    mittwoch: 'Mittwoch',
    donnerstag: 'Donnerstag',
    freitag: 'Freitag'
};

dayBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        dayBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDay = btn.dataset.day;
        selectedDayTitle.textContent = dayNames[selectedDay];
        renderClasses();
    });
});

function renderClasses() {
    classList.innerHTML = '';
    const classes = schedule[selectedDay] || [];
    
    // Sort by time
    classes.sort((a, b) => a.time.localeCompare(b.time));
    
    classes.forEach((classItem, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="class-info">
                <div class="class-time">${classItem.time}</div>
                <div class="class-subject">${classItem.subject}</div>
                <div class="class-room">${classItem.room}</div>
            </div>
            <button class="delete-btn" onclick="deleteClass(${index})">Löschen</button>
        `;
        classList.appendChild(li);
    });
    
    localStorage.setItem('schedule', JSON.stringify(schedule));
}

function addClass() {
    const subject = classSubjectInput.value.trim();
    const time = classTimeInput.value;
    const room = classRoomInput.value.trim();
    
    if (!subject || !time || !room) {
        alert('Bitte fülle alle Felder aus.');
        return;
    }
    
    if (!schedule[selectedDay]) {
        schedule[selectedDay] = [];
    }
    
    schedule[selectedDay].push({ subject, time, room });
    localStorage.setItem('schedule', JSON.stringify(schedule));
    
    classSubjectInput.value = '';
    classTimeInput.value = '';
    classRoomInput.value = '';
    
    renderClasses();
}

window.deleteClass = function(index) {
    schedule[selectedDay].splice(index, 1);
    localStorage.setItem('schedule', JSON.stringify(schedule));
    renderClasses();
};

addClassBtn.addEventListener('click', addClass);

clearScheduleBtn.addEventListener('click', () => {
    if (confirm('Möchtest du den gesamten Stundenplan wirklich löschen?')) {
        schedule = {
            montag: [],
            dienstag: [],
            mittwoch: [],
            donnerstag: [],
            freitag: []
        };
        localStorage.setItem('schedule', JSON.stringify(schedule));
        renderClasses();
    }
});

// Initialize class list
renderClasses();

// ========== HAUSAUFGABEN ==========
const homeworkTaskInput = document.getElementById('homeworkTask');
const homeworkSubjectInput = document.getElementById('homeworkSubject');
const homeworkDueInput = document.getElementById('homeworkDue');
const homeworkPriorityInput = document.getElementById('homeworkPriority');
const addHomeworkBtn = document.getElementById('addHomework');
const homeworkList = document.getElementById('homeworkList');
const pendingHomeworkEl = document.getElementById('pendingHomework');
const completedHomeworkEl = document.getElementById('completedHomework');
const clearHomeworkBtn = document.getElementById('clearHomework');

let homework = JSON.parse(localStorage.getItem('homework')) || [];

function renderHomework() {
    homeworkList.innerHTML = '';
    
    // Sort by due date and priority
    homework.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.due) - new Date(b.due);
    });
    
    homework.forEach((item, index) => {
        const li = document.createElement('li');
        if (item.completed) {
            li.classList.add('completed');
        }
        
        const priorityLabels = {
            high: 'Hoch',
            medium: 'Mittel',
            low: 'Niedrig'
        };
        
        const dueDate = new Date(item.due);
        const formattedDate = dueDate.toLocaleDateString('de-DE');
        
        li.innerHTML = `
            <div class="homework-info">
                <div class="homework-task">${item.task}</div>
                <div class="homework-subject">${item.subject}</div>
                <div class="homework-due">Fällig: ${formattedDate}</div>
                <span class="homework-priority ${item.priority}">${priorityLabels[item.priority]}</span>
            </div>
            <div class="homework-actions">
                <button class="complete-btn" onclick="toggleHomework(${index})">${item.completed ? '↩' : '✓'}</button>
                <button class="delete-btn" onclick="deleteHomework(${index})">Löschen</button>
            </div>
        `;
        homeworkList.appendChild(li);
    });
    
    updateHomeworkStats();
    localStorage.setItem('homework', JSON.stringify(homework));
}

function updateHomeworkStats() {
    const pending = homework.filter(h => !h.completed).length;
    const completed = homework.filter(h => h.completed).length;
    pendingHomeworkEl.textContent = pending;
    completedHomeworkEl.textContent = completed;
}

function addHomework() {
    const task = homeworkTaskInput.value.trim();
    const subject = homeworkSubjectInput.value.trim();
    const due = homeworkDueInput.value;
    const priority = homeworkPriorityInput.value;
    
    if (!task || !subject || !due) {
        alert('Bitte fülle alle Pflichtfelder aus.');
        return;
    }
    
    homework.push({ task, subject, due, priority, completed: false });
    localStorage.setItem('homework', JSON.stringify(homework));
    
    homeworkTaskInput.value = '';
    homeworkSubjectInput.value = '';
    homeworkDueInput.value = '';
    homeworkPriorityInput.value = 'medium';
    
    renderHomework();
}

window.toggleHomework = function(index) {
    homework[index].completed = !homework[index].completed;
    localStorage.setItem('homework', JSON.stringify(homework));
    renderHomework();
};

window.deleteHomework = function(index) {
    homework.splice(index, 1);
    localStorage.setItem('homework', JSON.stringify(homework));
    renderHomework();
};

addHomeworkBtn.addEventListener('click', addHomework);

clearHomeworkBtn.addEventListener('click', () => {
    if (confirm('Möchtest du alle Hausaufgaben wirklich löschen?')) {
        homework = [];
        localStorage.setItem('homework', JSON.stringify(homework));
        renderHomework();
    }
});

// Initialize homework list
renderHomework();

// ========== SERVICE WORKER REGISTRATION ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registriert:', registration);
            })
            .catch(error => {
                console.log('Service Worker Registrierung fehlgeschlagen:', error);
            });
    });
}
