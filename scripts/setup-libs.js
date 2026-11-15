// Копирует файлы MediaPipe Pose из node_modules в www/libs/mediapipe/pose (для 100% офлайна).
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'pose');
const dst = path.join(__dirname, '..', 'www', 'libs', 'mediapipe', 'pose');
const REQUIRED = [
  'pose.js', 'pose_solution_packed_assets_loader.js', 'pose_solution_packed_assets.data',
  'pose_solution_simd_wasm_bin.js', 'pose_solution_simd_wasm_bin.wasm',
  'pose_solution_wasm_bin.js', 'pose_solution_wasm_bin.wasm',
  'pose_landmark_lite.tflite', 'pose_landmark_full.tflite', 'pose_web.binarypb'
];

if (!fs.existsSync(src)) {
  console.error('✖ Не найден node_modules/@mediapipe/pose. Сначала выполни: npm install');
  process.exit(1);
}
fs.mkdirSync(dst, { recursive: true });
const wanted = /\.(js|wasm|data|tflite|binarypb)$/;
let n = 0;
for (const f of fs.readdirSync(src)) {
  if (wanted.test(f)) { fs.copyFileSync(path.join(src, f), path.join(dst, f)); n++; }
}
const missing = REQUIRED.filter((f) => !fs.existsSync(path.join(dst, f)));
console.log(`✔ Скопировано файлов: ${n} → www/libs/mediapipe/pose`);
if (missing.length) {
  console.error('✖ Не хватает файлов:\n  ' + missing.join('\n  '));
  process.exit(1);
}
console.log('✔ Все обязательные файлы модели на месте. Приложение готово к работе без интернета.');
