/*
 * STAY HARD // облачный модуль (кланы, рейтинг, чат).
 * Работает по REST без SDK и CDN — приложение остаётся offline-first.
 * Очередь офлайн-тренировок хранится в index.html (localStorage), здесь только транспорт.
 *
 * ВСТАВЬ СВОИ КЛЮЧИ НИЖЕ (Supabase: Project Settings → API).
 * SQL-схема лежит в supabase.sql в корне проекта.
 */
(function () {
  'use strict';

  const CONFIG = {
    provider: 'supabase',                 // 'supabase' | 'firebase' | 'none'
    supabase: {
      url: '',                            // например: https://abcdxyz.supabase.co
      anonKey: ''                         // публичный anon-ключ
    },
    firebase: { apiKey: '', projectId: '' } // заглушка: адаптер не реализован
  };

  const providers = {};

  providers.supabase = function (cfg) {
    const base = cfg.url.replace(/\/+$/, '') + '/rest/v1';
    const headers = (extra) => Object.assign({
      apikey: cfg.anonKey,
      Authorization: 'Bearer ' + cfg.anonKey,
      'Content-Type': 'application/json'
    }, extra || {});

    async function req(path, opt) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 12000);
      try {
        const res = await fetch(base + path, Object.assign({ signal: ctl.signal }, opt));
        const text = await res.text();
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + text.slice(0, 120));
        return text ? JSON.parse(text) : null;
      } finally { clearTimeout(timer); }
    }
    const post = (path, prefer, rows) => req(path, {
      method: 'POST', headers: headers({ Prefer: prefer }), body: JSON.stringify(rows)
    });

    return {
      ensureClan: (tag) => post('/clans?on_conflict=tag', 'resolution=ignore-duplicates,return=minimal', [{ tag }]),
      upsertMember: (m) => post('/members?on_conflict=clan,uid', 'resolution=merge-duplicates,return=minimal',
        [Object.assign({}, m, { updated_at: new Date().toISOString() })]),
      insertWorkouts: (rows) => post('/workouts?on_conflict=id', 'resolution=ignore-duplicates,return=minimal', rows),
      insertMessages: (rows) => post('/messages?on_conflict=id', 'resolution=ignore-duplicates,return=minimal', rows),
      leaderboard: (clan) => req('/members?clan=eq.' + encodeURIComponent(clan) +
        '&select=uid,name,streak,total&order=total.desc&limit=50', { headers: headers() }),
      messages: (clan, limit) => req('/messages?clan=eq.' + encodeURIComponent(clan) +
        '&select=id,uid,name,text,kind,ts&order=ts.desc&limit=' + (limit || 50), { headers: headers() })
        .then((r) => (r || []).reverse())
    };
  };

  // Заглушка Firebase Firestore: допиши 6 методов (REST: https://firestore.googleapis.com/v1/projects/<id>/databases/(default)/documents)
  providers.firebase = function () {
    const notImpl = () => Promise.reject(new Error('Firebase-адаптер не реализован: используй provider "supabase"'));
    return { ensureClan: notImpl, upsertMember: notImpl, insertWorkouts: notImpl, insertMessages: notImpl, leaderboard: notImpl, messages: notImpl };
  };

  const configured =
    (CONFIG.provider === 'supabase' && CONFIG.supabase.url && CONFIG.supabase.anonKey) ||
    (CONFIG.provider === 'firebase' && CONFIG.firebase.apiKey && CONFIG.firebase.projectId);

  const impl = configured ? providers[CONFIG.provider](CONFIG[CONFIG.provider]) : null;
  const off = () => Promise.reject(new Error('Облако не настроено (js/cloud.js)'));

  window.StayHardCloud = {
    isConfigured: () => !!impl,
    ensureClan: (...a) => (impl ? impl.ensureClan(...a) : off()),
    upsertMember: (...a) => (impl ? impl.upsertMember(...a) : off()),
    insertWorkouts: (...a) => (impl ? impl.insertWorkouts(...a) : off()),
    insertMessages: (...a) => (impl ? impl.insertMessages(...a) : off()),
    leaderboard: (...a) => (impl ? impl.leaderboard(...a) : off()),
    messages: (...a) => (impl ? impl.messages(...a) : off())
  };
})();
