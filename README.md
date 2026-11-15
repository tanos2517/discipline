# STAY HARD // TACTICAL AI PROTOCOL v4 (offline-first)

## Структура проекта
```
package.json            скрипты сборки, зависимость @mediapipe/pose (только для копирования файлов)
capacitor.config.json   настройки Android-обёртки (webDir = www)
vercel.json             Vercel: buildCommand "npm run build", outputDirectory "www"
supabase.sql            схема облака для клана/рейтинга
scripts/setup-libs.js   копирует модель MediaPipe в www/libs
www/
  index.html            всё приложение
  sw.js, manifest.json  офлайн и установка PWA
  js/cloud.js           облачный модуль (сюда вставляются ключи)
  icon-*.png            иконки
  libs/mediapipe/pose/  ← создаётся командой `npm run setup` (в git не хранится)
```

## Файлы MediaPipe, которые должны лежать в `www/libs/mediapipe/pose/`
| Файл | Назначение |
|---|---|
| `pose.js` | основной скрипт (подключается тегом `<script>`) |
| `pose_solution_packed_assets_loader.js`, `pose_solution_packed_assets.data` | упакованные ресурсы графа |
| `pose_solution_simd_wasm_bin.js`, `pose_solution_simd_wasm_bin.wasm` | WASM со SIMD (быстрый путь) |
| `pose_solution_wasm_bin.js`, `pose_solution_wasm_bin.wasm` | WASM без SIMD (запасной путь) |
| `pose_landmark_lite.tflite` | модель (телефоны, `modelComplexity: 0`) |
| `pose_landmark_full.tflite` | модель (ноутбуки, `modelComplexity: 1`) |
| `pose_web.binarypb` | описание графа |

`pose_landmark_heavy.tflite` тоже копируется, но приложением не используется (можно удалить для экономии ~30 МБ).
Скачивать вручную не нужно: `npm install && npm run setup` берёт всё из пакета `@mediapipe/pose@0.5.1675469404`
и сам проверяет, что все 10 обязательных файлов на месте.

## Запуск и проверка локально
```bash
npm install
npm run setup
npm run serve          # http://localhost:8080  (камера работает на localhost без HTTPS)
```
Проверка офлайна: открой приложение один раз, затем DevTools → Network → Offline → перезагрузи страницу.

## Vercel
Ничего вручную: `vercel.json` сам запустит `npm run build` (копирование модели) и отдаст папку `www`.

## Сборка Android APK (Capacitor)
Нужны: Node 18+, JDK 17, Android Studio (SDK).
```bash
npm install
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npm run setup
npx cap add android
```
Открой `android/app/src/main/AndroidManifest.xml` и добавь внутри `<manifest>` (рядом с INTERNET):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```
Дальше любой из вариантов:
```bash
npx cap sync android
npx cap open android            # Android Studio → Build → Build APK(s)
# или из консоли:
npm run android:apk             # готовый файл: android/app/build/outputs/apk/debug/app-debug.apk
```
После каждого изменения в `www/` выполняй `npx cap sync android`.
Для релиза в Google Play нужен подписанный `bundle` (Build → Generate Signed Bundle).

## Клан и рейтинг
1. Создай проект на supabase.com → SQL Editor → вставь `supabase.sql` → Run.
2. В `www/js/cloud.js` впиши `supabase.url` и `supabase.anonKey` (Project Settings → API).
3. Без ключей приложение работает полностью офлайн, вкладка клана просто показывает подсказку.

Тренировки в клане копятся в `localStorage` (`sh_queue`) и уходят сами при появлении сети (событие `online` + проверка каждые 30 сек).
Отправка идемпотентна (id записей уникальны), поэтому повторная отправка не создаёт дублей.

## Известные ограничения
- Политики в `supabase.sql` открытые (любой с anon-ключом может писать). Для публичного релиза добавь Supabase Auth.
- Адаптер Firebase в `cloud.js` — заглушка (6 методов), реализован только Supabase.
- Отжимания считаются только по верхней зоне (таз и ноги не анализируются), поэтому от сгибаний рук на бицепс их отличает смещение плеч. Камера должна стоять неподвижно; если её сдвинули, приложение само пересчитает базовый уровень через несколько секунд.
- Расписание срабатывает, пока приложение открыто или в фоне. Для будильника при закрытом приложении нужен плагин `@capacitor/local-notifications` (в этой версии не подключён).
