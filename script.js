// ==================== GLOBAL DƏYİŞƏNLƏR ====================
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const outputText = document.getElementById('output');

// Hand Tracking dəyişənləri
let hands = null;
let camera = null;
let isTracking = false;
let showPoints = true;

// Klaviatura layout-u
const keyboardLayout = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
    ['Space', 'Backspace', 'Clear']
];

// Əl nöqtələri və aktiv düymə
let activeKey = null;
let lastPressTime = 0;
const pressDelay = 500; // ms

// ==================== KLaviatura YARAT ====================
function createKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';

    keyboardLayout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'key-row';

        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            
            // Düymə növünə görə stillər
            if (key === 'Space') {
                keyDiv.classList.add('space');
                keyDiv.textContent = 'Boşluq';
            } else if (key === 'Enter') {
                keyDiv.classList.add('special');
                keyDiv.textContent = 'Enter';
            } else if (key === 'Backspace') {
                keyDiv.classList.add('special');
                keyDiv.textContent = '⌫';
            } else if (key === 'Shift') {
                keyDiv.classList.add('special');
                keyDiv.textContent = '⇧';
            } else if (key === 'Clear') {
                keyDiv.classList.add('special');
                keyDiv.textContent = '🗑️';
            } else {
                keyDiv.textContent = key.toUpperCase();
            }

            keyDiv.dataset.key = key;
            keyDiv.onclick = () => simulateKeyPress(key);
            rowDiv.appendChild(keyDiv);
        });

        keyboard.appendChild(rowDiv);
    });
}

// ==================== HAND TRACKING QURULUMU ====================
async function initHandTracking() {
    // MediaPipe Hands konfiqurasiyası
    hands = new Hands({
        locateFile: (file) => {
            return https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file};
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onHandResults);

    // Kamera qurulumu
    camera = new Camera(videoElement, {
        onFrame: async () => {
            if (hands && isTracking) {
                await hands.send({ image: videoElement });
            }
        },
        width: 640,
        height: 480
    });
}

// ==================== HAND TRACKING NƏTİCƏLƏRİ ====================
function onHandResults(results) {
    // Canvas-ı təmizlə
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        updateTrackingStatus('Aktiv');
        updateHandPosition('Əl algılandı');
        
        // Əl nöqtələrini çək
        drawHandLandmarks(results.multiHandLandmarks[0]);
        
        // Barmaq hərəkətlərini izlə
        detectFingerGestures(results.multiHandLandmarks[0]);
    } else {
        updateTrackingStatus('Əl görünmür');
        updateHandPosition('-');
    }
}

// ==================== ƏL NÖQTƏLƏRİNİ ÇƏK ====================
function drawHandLandmarks(landmarks) {
    canvasCtx.save();
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);

    // Bağlantıları çək
    canvasCtx.strokeStyle = '#4caf50';
    canvasCtx.lineWidth = 3;

    // MediaPipe hand connections
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Baş barmaq
        [0, 5], [5, 6], [6, 7], [7, 8], // İşarə barmağı
        [0, 9], [9, 10], [10, 11], [11, 12], // Orta barmaq
        [0, 13], [13, 14], [14, 15], [15, 16], // Üzük barmaq
        [0, 17], [17, 18], [18, 19], [19, 20], // Çeçələ
        [0, 5], [5, 9], [9, 13], [13, 17] // Ovuc
    ];

    canvasCtx.beginPath();
    connections.forEach(conn => {
        const start = landmarks[conn[0]];
        const end = landmarks[conn[1]];
        
        if (start && end) {
            canvasCtx.moveTo(start.x * canvasElement.width, start.y * canvasElement.height);
            canvasCtx.lineTo(end.x * canvasElement.width, end.y * canvasElement.height);
        }
    });
    canvasCtx.stroke();

    // Nöqtələri çək
    if (showPoints) {
        landmarks.forEach((point, index) => {
            const x = point.x * canvasElement.width;
            const y = point.y * canvasElement.height;
            
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 6, 0, 2 * Math.PI);
            
            // Barmaq uc nöqtələri fərqli rəngdə
            if ([4, 8, 12, 16, 20].includes(index)) {
                canvasCtx.fillStyle = '#ff4444';
                updateFingerIndicator(index);
            } else {
                canvasCtx.fillStyle = '#4caf50';
            }
            
            canvasCtx.shadowColor = '#4caf50';
            canvasCtx.shadowBlur = 10;
            canvasCtx.fill();
            
            // Koordinatları yenilə (işarə barmağı üçün)
            if (index === 8) {
                updateCoordinates(x, y);
                checkKeyHover(x, y);
            }
        });
    }

    canvasCtx.restore();
}

// ==================== BARMAQ HƏRƏKƏTLƏRİNİ İZLƏ ====================
function detectFingerGestures(landmarks) {
    // İşarə barmağı uc nöqtəsi (index 8)
    const indexTip = landmarks[8];
    // Baş barmaq uc nöqtəsi (index 4)
    const thumbTip = landmarks[4];
    
    if (indexTip && thumbTip) {
        // Baş barmaq və işarə barmağı arasındakı məsafə
        const distance = Math.sqrt(
            Math.pow(indexTip.x - thumbTip.x, 2) + 
            Math.pow(indexTip.y - thumbTip.y, 2)
        );
        
        // Əgər barmaqlar yaxınlaşıbsa (klikləmə)
        if (distance < 0.05) {
            const currentTime = Date.now();
            if (currentTime - lastPressTime > pressDelay && activeKey) {
                simulateKeyPress(activeKey);
                lastPressTime = currentTime;
                highlightKey(activeKey, true);
                setTimeout(() => highlightKey(activeKey, false), 200);
            }
        }
    }
}

// ==================== DÜYMƏ ÜZƏRİNDƏ HOVER ====================
function checkKeyHover(x, y) {
    // Ekran koordinatlarını klaviatura koordinatlarına çevir
    const keyboardRect = document.querySelector('.virtual-keyboard').getBoundingClientRect();
    const keys = document.querySelectorAll('.key');
    
    let hoveredKey = null;
    
    keys.forEach(key => {
        const rect = key.getBoundingClientRect();
        
        // Hover yoxlaması
        if (x >= rect.left && x <= rect.right && 
            y >= rect.top && y <= rect.bottom) {
            hoveredKey = key.dataset.key;
        }
    });
    
    // Aktiv düyməni yenilə
    if (hoveredKey !== activeKey) {
        if (activeKey) {
            highlightKey(activeKey, false);
        }
        if (hoveredKey) {
            highlightKey(hoveredKey, true);
        }
        activeKey = hoveredKey;
        updateActiveFinger(hoveredKey);
    }
}

// ==================== DÜYMƏNİ VURĞULA ====================
function highlightKey(key, highlight) {
    const keys = document.querySelectorAll('.key');
    keys.forEach(k => {
        if (k.dataset.key === key) {
            if (highlight) {
                k.classList.add('highlighted');
                k.style.transform = 'scale(1.1) translateY(-5px)';
            } else {
                k.classList.remove('highlighted');
                k.style.transform = '';
            }
        }
    });
}

// ==================== KLİK SİMULYASİYASI ====================
function simulateKeyPress(key) {
    const currentText = outputText.value;
    
    switch(key) {
        case 'Space':
            outputText.value += ' ';
            break;
        case 'Enter':
            outputText.value += '\n';
            break;
        case 'Backspace':
            outputText.value = currentText.slice(0, -1);
            break;
        case 'Clear':
            outputText.value = '';
            break;
        case 'Shift':
            // Shift funksionallığı əlavə edilə bilər
            break;
        default:
            outputText.value += key;
    }
    
    // Scroll ən aşağı
    outputText.scrollTop = outputText.scrollHeight;
}

// ==================== UI YENİLƏMƏ FUNKSİYALARI ====================
function updateTrackingStatus(status) {
    document.getElementById('trackingStatus').textContent = status;
}

function updateHandPosition(position) {
    document.getElementById('handPosition').textContent = position;
}

function updateCoordinates(x, y) {
    document.getElementById('coordinates').textContent = 
        x: ${Math.round(x)}, y: ${Math.round(y)};
}

function updateActiveFinger(key) {
    document.getElementById('activeFinger').textContent = 
        key ? "${key}" üzərində : 'Yox';
}

function updateFingerIndicator(fingerIndex) {
    const dots = document.querySelectorAll('.finger-dot');
    dots.forEach(dot => dot.classList.remove('active'));
    
    const fingerMap = {4: 0, 8: 1, 12: 2, 16: 3, 20: 4};
    if (fingerMap[fingerIndex] !== undefined) {
        dots[fingerMap[fingerIndex]].classList.add('active');
    }
}

// ==================== KAMERA KONTROLLARI ====================
async function startHandTracking() {
    try {
        await initHandTracking();
        await camera.start();
        isTracking = true;
        updateTrackingStatus('Başladı');
        
        // Canvas ölçülərini təyin et
        canvasElement.width = videoElement.videoWidth || 640;
        canvasElement.height = videoElement.videoHeight || 480;
    } catch (error) {
        console.error('Kamera xətası:', error);
        alert('Kameraya giriş icazəsi verilmədi! Zəhmət olmasa brauzer parametrlərini yoxlayın.');
    }
}

function stopHandTracking() {
    if (camera) {
        camera.stop();
        isTracking = false;
        updateTrackingStatus('Dayandı');
        updateHandPosition('-');
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
}

function toggleFingerPoints() {
    showPoints = !showPoints;
}

function clearOutput() {
    outputText.value = '';
}

// ==================== SƏHİFƏ YÜKLƏNDƏ ====================
document.addEventListener('DOMContentLoaded', () => {
    createKeyboard();
    
    // Canvas ölçülərini təyin et
    canvasElement.width = 640;
    canvasElement.height = 480;
    
    // Event listener əlavə et
    window.addEventListener('resize', () => {
        if (isTracking) {
            canvasElement.width = videoElement.videoWidth || 640;
            canvasElement.height = videoElement.videoHeight || 480;
        }
    });
});

// ==================== GLOBAL FUNKSİYALAR ====================
window.startHandTracking = startHandTracking;
window.stopHandTracking = stopHandTracking;
window.toggleFingerPoints = toggleFingerPoints;
window.clearOutput = clearOutput;
