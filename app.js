// === Настройки ===
const SOUND_URL = 'sound.mp3';
const NOTIFICATION_INTERVAL = 2000; // 2 секунды
const NOTIFICATION_COUNT = 3;

// === DOM-элементы ===
const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const toggleSoundBtn = document.getElementById('toggle-sound');
const cameraSelect = document.getElementById('camera-select');
const activityIndicator = document.getElementById('activity-indicator');

// === Состояния ===
let isAlertEnabled = true;
let lastDetectionTime = 0;
let audioContext = new (window.AudioContext || window.webkitAudioContext)();

// === Инициализация MediaPipe ===
const detectorConfig = {
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` 
};

const detector = new Pose({
  ...detectorConfig,
  staticImageMode: false,
  modelType: 'full',
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

detector.setOptions({
  selfieMode: true
});

// === Обработка видеопотока ===
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.addEventListener('loadeddata', () => {
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    requestAnimationFrame(processFrame);
  });
}

// === Основной цикл ===
async function processFrame() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  
  try {
    const results = await detector.estimatePoses(video);
    
    if (results.length > 0) {
      drawBoundingBoxes(results);
      triggerAlert();
    }
  } catch (error) {
    console.error('Ошибка детекции:', error);
  }

  requestAnimationFrame(processFrame);
}

// === Рисование рамок ===
function drawBoundingBoxes(poses) {
  poses.forEach(pose => {
    const { boundingBox } = pose;
    if (boundingBox) {
      ctx.strokeStyle = '#00FFB3';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        boundingBox topLeft.x,
        boundingBox topLeft.y,
        boundingBox size.width,
        boundingBox size.height
      );
    }
  });
}

// === Звуковые уведомления ===
function triggerAlert() {
  if (!isAlertEnabled) return;
  
  const now = Date.now();
  if (now - lastDetectionTime > 5000) {
    lastDetectionTime = now;
    activityIndicator.classList.remove('hidden');
    
    for (let i = 0; i < NOTIFICATION_COUNT; i++) {
      setTimeout(() => {
        playSound();
      }, i * NOTIFICATION_INTERVAL);
    }
  }
}

// === Воспроизведение звука ===
function playSound() {
  fetch(SOUND_URL)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    });
}

// === Обработчики событий ===
toggleSoundBtn.addEventListener('click', () => {
  isAlertEnabled = !isAlertEnabled;
  toggleSoundBtn.textContent = `🔔 Уведомления: ${isAlertEnabled ? 'ВКЛ' : 'ВЫКЛ'}`;
});

// === Выбор камеры ===
async function populateCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter(d => d.kind === 'videoinput');
  
  cameras.forEach((camera, index) => {
    const option = document.createElement('option');
    option.value = camera.deviceId;
    option.text = `Камера ${index + 1}`;
    cameraSelect.appendChild(option);
  });

  cameraSelect.addEventListener('change', async () => {
    video.srcObject = null;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: cameraSelect.value }
    });
    video.srcObject = stream;
  });
}

// === Инициализация ===
setupCamera().catch(err => {
  alert('Не удалось получить доступ к камере: ' + err.message);
});

populateCameras();
