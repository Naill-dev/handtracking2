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

// ==================== KAMERA ƏLAVƏ YOXLAMASI ====================
// Brauzerin kameraya girişini yoxla
async function checkCameraSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Brauzeriniz kameraya girişi dəstəkləmir! Chrome, Edge və ya Firefox istifadə edin.');
        return false;
    }
    
    try {
        // Kameraları yoxla
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        
        if (cameras.length === 0) {
            alert('Heç bir kamera tapılmadı! Zəhmət olmasa kameranızı qoşun.');
            return false;
        }
        
        console.log(${cameras.length} kamera tapıldı:, cameras);
        return true;
    } catch (error) {
        console.error('Kamera yoxlama xətası:', error);
        return false;
    }
}

// ==================== HAND TRACKING QURULUMU ====================
async function initHandTracking() {
    try {
        // MediaPipe Hands konfiqurasiyası
        hands = new Hands({
            locateFile: (file) => {
                return https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469241/${file};
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onHandResults);
        
        console.log('Hand Tracking quruldu');
        return true;
    } catch (error) {
        console.error('Hand Tracking qurulum xətası:', error);
        alert('Hand Tracking yüklənə bilmədi! İnternet bağlantınızı yoxlayın.');
        return false;
    }
}

// ==================== KAMERA BAŞLAT ====================
async function startHandTracking() {
    try {
        // Kamera dəstəyini yoxla
        const hasCamera = await checkCameraSupport();
        if (!hasCamera) return;
        
        // Hand Tracking qur
        const handTrackingReady = await initHandTracking();
        if (!handTrackingReady) return;
        
        // Kamera stream-i yarat
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            } 
        });
        
        // Video elementinə stream-i təyin et
        videoElement.srcObject = stream;
        
        // Video yüklənəndə
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            
            // Canvas ölçülərini təyin et
            canvasElement.width = videoElement.videoWidth || 640;
            canvasElement.height = videoElement.videoHeight || 480;
            
            // Tracking-ə başla
            isTracking = true;
            updateTrackingStatus('Aktiv');
            
            // Frame-ləri işlə
            processFrames();
            
            console.log('Kamera başladı:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        };
        
    } catch (error) {
        console.error('Kamera xətası:', error);
        
        if (error.name === 'NotAllowedError') {
            alert('Kamera icazəsi verilmədi! Zəhmət olmasa brauzer parametrlərindən kameraya icazə verin.');
        } else if (error.name === 'NotFoundError') {
            alert('Kamera tapılmadı! Zəhmət olmasa kameranızı qoşun.');
        } else if (error.name === 'NotReadableError') {
            alert('Kamera başqa proqram tərəfindən istifadə olunur! Başqa proqramları bağlayın.');
        } else {
            alert('Kamera xətası: ' + error.message);
        }
    }
}

// ==================== FRAME-LƏRİ İŞLƏ ====================
async function processFrames() {
    if (!isTracking || !hands) return;
    
    try {
        await hands.send({ image: videoElement });
    } catch (error) {
        console.error('Frame işləmə xətası:', error);
    }
    
    // Növbəti frame-i işlə
    if (isTracking) {
        requestAnimationFrame(processFrames);
    }
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
    } else {
        updateTrackingStatus('Əl gözlənilir');
        updateHandPosition('-');
    }
}

// ==================== KAMERA DAYANDIR ====================
function stopHandTracking() {
    isTracking = false;
    
    // Stream-i dayandır
    if (videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    
    updateTrackingStatus('Dayandı');
    updateHandPosition('-');
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    console.log('Kamera dayandı');
}

// ==================== KLaviatura YARAT ====================
function createKeyboard() {
    const keyboardLayout = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
        ['Space', 'Backspace', 'Clear']
    ];

    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';

    keyboardLayout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'key-row';

        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            
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

// ==================== ƏL NÖQTƏLƏRİNİ ÇƏK ====================
function drawHandLandmarks(landmarks) {
    canvasCtx.save();
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);

    // Bağlantıları çək
    canvasCtx.strokeStyle = '#4caf50';
    canvasCtx.lineWidth = 3;

    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [0, 5], [5, 9], [9, 13], [13, 17]
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
            
            if ([4, 8, 12, 16, 20].includes(index)) {
                canvasCtx.fillStyle = '#ff4444';
                updateFingerIndicator(index);
            } else {
                canvasCtx.fillStyle = '#4caf50';
            }
            
            canvasCtx.shadowColor = '#4caf50';
            canvasCtx.shadowBlur = 10;
            canvasCtx.fill();
            
            if (index === 8) {
                updateCoordinates(x, y);
            }
        });
    }

    canvasCtx.restore();
}

// ==================== DİGƏR FUNKSİYALAR ====================
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
        default:
            outputText.value += key;
    }
    
    outputText.scrollTop = outputText.scrollHeight;
}

function updateTrackingStatus(status) {
    const el = document.getElementById('trackingStatus');
    if (el) el.textContent = status;
}

function updateHandPosition(position) {
    const el = document.getElementById('handPosition');
    if (el) el.textContent = position;
}

function updateCoordinates(x, y) {
    const el = document.getElementById('coordinates');
    if (el) el.textContent = x: ${Math.round(x)}, y: ${Math.round(y)};
}

function updateFingerIndicator(fingerIndex) {
    const dots = document.querySelectorAll('.finger-dot');
    dots.forEach(dot => dot.classList.remove('active'));
    
    const fingerMap = {4: 0, 8: 1, 12: 2, 16: 3, 20: 4};
    if (fingerMap[fingerIndex] !== undefined) {
        dots[fingerMap[fingerIndex]].classList.add('active');
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
});

// Global funksiyalar
window.startHandTracking = startHandTracking;
window.stopHandTracking = stopHandTracking;
window.toggleFingerPoints = toggleFingerPoints;
window.clearOutput = clearOutput;
