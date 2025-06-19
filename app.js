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
      requestAnimationFrame(processFrame);
    };
  } catch (err) {
    console.error('Ошибка доступа к камере:', err);
    alert('Не удалось получить доступ к камере');
  }
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
    const landmarks = pose.landmarks;
    if (!landmarks) return;

    // Найдём минимальные и максимальные координаты
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    landmarks.forEach(point => {
      if (point.x < minX) minX = point.x * video.videoWidth;
      if (point.y < minY) minY = point.y * video.videoHeight;
      if (point.x > maxX) maxX = point.x * video.videoWidth;
      if (point.y > maxY) maxY = point.y * video.videoHeight;
    });

    // Нарисуем рамку
    ctx.strokeStyle = '#00FFB3';
    ctx.lineWidth = 3;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
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
  toggleSoundBtn.style.background = isAlertEnabled 
    ? 'linear-gradient(135deg, #00ffaa, #00ccff)' 
    : 'linear-gradient(135deg, #ff4444, #cc0000)';
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

// === Инициализация ===
async function init() {
  await populateCameras();
  await setupCamera();
}

init();
