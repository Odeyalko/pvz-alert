// === Настройки ===
const SOUND_URL = 'sound.mp3';
const NOTIFICATION_INTERVAL = 2000;
const NOTIFICATION_COUNT = 3;

// === DOM-элементы ===
const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const toggleSoundBtn = document.getElementById('toggle-sound');
const cameraSelect = document.getElementById('camera-select');
const eventLog = document.getElementById('event-log');
const loadingIndicator = document.getElementById('loading');

// === Состояния ===
let isAlertEnabled = true;
let lastDetectionTime = 0;
let audioContext = new (window.AudioContext || window.webkitAudioContext)();

// === Инициализация MediaPipe ===
const detector = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`, 
  selfieMode: true,
  modelType: 'full',
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

// === Обработка результатов ===
detector.onResults(onResults);

function onResults(results) {
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  if (results.poseLandmarks) {
    drawBoundingBox(results.poseLandmarks);
    triggerAlert();
  }
}

// === Рисование рамок ===
function drawBoundingBox(landmarks) {
  const coords = landmarks.map(p => ({ x: p.x * video.videoWidth, y: p.y * video.videoHeight }));
  const xs = coords.map(p => p.x);
  const ys = coords.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  ctx.strokeStyle = '#00FFB3';
  ctx.lineWidth = 3;
  ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
}

// === Звуковые уведомления ===
function triggerAlert() {
  if (!isAlertEnabled) return;

  const now = Date.now();
  if (now - lastDetectionTime > 5000) {
    lastDetectionTime = now;

    const time = new Date().toLocaleTimeString();
    const logEntry = document.createElement('p');
    logEntry.textContent = `⚠️ Клиент обнаружен • ${time}`;
    eventLog.prepend(logEntry);

    for (let i = 0; i < NOTIFICATION_COUNT; i++) {
      setTimeout(() => {
        playSound();
      }, i * NOTIFICATION_INTERVAL);
    }
  }
}

// === Воспроизведение звука ===
async function playSound() {
  try {
    const response = await fetch(SOUND_URL);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (err) {
    console.error('Ошибка воспроизведения звука:', err);
  }
}

// === Обработчики событий ===
toggleSoundBtn.addEventListener('click', () => {
  isAlertEnabled = !isAlertEnabled;
  toggleSoundBtn.textContent = `🔔 Уведомления: ${isAlertEnabled ? 'ВКЛ' : 'ВЫКЛ'}`;
});

// === Выбор камеры ===
async function populateCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');

    if (cameras.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'Камера не найдена';
      option.disabled = true;
      cameraSelect.appendChild(option);
      return;
    }

    cameras.forEach((camera, index) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.text = `Камера ${index + 1}`;
      cameraSelect.appendChild(option);
    });

    cameraSelect.addEventListener('change', async () => {
      await setupCamera(cameraSelect.value);
    });
  } catch (err) {
    console.error('Ошибка получения камер:', err);
  }
}

// === Обработка видеопотока ===
async function setupCamera(deviceId = undefined) {
  try {
    const constraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : true
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    video.onloadeddata = () => {
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      video.play();
      loadingIndicator.style.display = 'none';
    };
  } catch (err) {
    console.error('Ошибка доступа к камере:', err);
    alert('Не удалось получить доступ к камере');
  }
}

// === Инициализация ===
async function init() {
  loadingIndicator.style.display = 'block';
  await populateCameras();
  await setupCamera();
}

init();
