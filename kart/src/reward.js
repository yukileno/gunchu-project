// 投稿アプリと同じオリジンで配信する。本人の合言葉をURLへ含めない。
const API_URL = 'https://script.google.com/macros/s/AKfycbxT6Jjil7opkd7scCr2HgE6b4g2WmrEtSXzb8WAM6prJtJSV_MCD07MFLpdM508BTzopQ/exec';
const token = (() => { try { return localStorage.getItem('gunpro_token_v1') || ''; } catch { return ''; } })();
const pendingKey = 'gunpro_kart_pending_v1';
const text = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = ms => `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(Math.floor(ms/10)%100).padStart(2,'0')}`;
const classNames={easy:'50cc',normal:'100cc',hard:'150cc'};
let selectedClass='easy';
let panel, runId, requestId, starting = false, pending = null, saving = false;
async function call(fn, ...args) {
  const response = await fetch(API_URL, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({fn,args:[token,...args]})});
  if (!response.ok) throw new Error('通信できなかったよ。接続を確認してね');
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || 'もう一度ためしてね');
  return result;
}
function show(content) {
  if (!panel) {
    panel = document.createElement('section'); panel.id = 'reward-panel';
    panel.className = 'race-portal';
    document.body.append(panel);
  }
  panel.hidden = false;
  panel.innerHTML = `<div class="portal-wrap"><header class="portal-header"><a class="portal-brand" href="../"><span class="brand-flag">▚</span> 郡中プロジェクト<span class="brand-divider">/</span><b>カートラリー</b></a><a class="portal-back" href="../">← 報告画面へもどる</a></header><main class="portal-main">${content}</main><footer class="portal-footer"><span>報告のその先へ。今日も、ひとっ走り！</span><span>1周レース ・ キーボード／ゲームパッド対応</span></footer></div>`;
}
function note(message) {
  let node = document.getElementById('kart-save-note');
  if (!node) {
    node = document.createElement('button'); node.id = 'kart-save-note';
    node.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:900;background:#fff;color:#152441;padding:8px 16px;border-radius:12px;font:16px sans-serif;pointer-events:auto';
    node.onclick = () => savePending(); document.body.append(node);
  }
  node.textContent = message;
}
async function savePending() {
  if (!pending || saving) return;
  saving = true; note('タイムを保存中…');
  try {
    await call('finishKartRace', pending.raceId, pending.timeMs);
    pending = null;
    try { localStorage.removeItem(pendingKey); } catch {}
    note('✅ タイムを保存したよ！');
  } catch (e) { note(`${e.message}（ここを押して保存を再試行）`); }
  finally { saving = false; }
}
export const reward = {
  name:'あなた', opponents:[], classes:['easy'], masterCount:0,
  async init() {
    show('<p>今日の報告とレース券を確認中…</p>');
    try {
      if (!token) { show('<p>先に報告画面で登録してね。</p>'); return false; }
      // 保存待ちは本人が一致する場合だけ再送する。
      try { const p=JSON.parse(localStorage.getItem(pendingKey)); if (p && p.owner===token) pending=p; } catch {}
      if (pending) await savePending();
      const status = await call('getKartStatus');
      this.name = status.name; this.opponents = status.opponents; this.classes=status.classes || ['easy']; this.masterCount=status.masterCount || 0;
      const playable = status.posted && !status.used && status.opponents.length;
      const statusTitle = status.used ? '今日のレースは終了！' : !status.posted ? '報告して、レースへ！' : !status.opponents.length ? '友だちの参加を待とう' : '今日のレース券、ゲット！';
      const statusCopy = status.used ? 'また明日、報告して走ろう。' : !status.posted ? '今日のできたことを報告すると遊べるよ。' : !status.opponents.length ? '相手になる友だちがまだ登録されていないよ。' : 'がんばった自分に、ごほうびの1周を。';
      show(`<div class="lobby-hero"><section class="lobby-copy"><div class="portal-eyebrow"><span class="eyebrow-line"></span> 毎日のがんばりが、走るチカラに。</div><h1 class="rally-logo"><span>郡中</span><strong>カートラリー<span class="logo-star">★</span></strong></h1><p class="hero-description">報告したら、サーキットへ。<br>自分だけのベストタイムをたたき出そう！</p><div class="race-status"><span class="status-icon">${playable ? '✓' : '！'}</span><div><strong>${statusTitle}</strong><p>${statusCopy}</p></div><span class="daily-badge">1日1回</span></div><div class="lobby-actions">${playable ? '<button class="portal-start" id="kart-enter"><span class="button-flag">▚</span> レーサーをえらぶ <span class="button-arrow">▶</span></button>' : '<a class="portal-start" href="../">報告画面へ <span class="button-arrow">▶</span></a>'}<button class="portal-rank-button" id="kart-ranking"><span>🏆</span> タイムランキングを見る <b>↗</b></button></div><p class="start-note">レース開始で1回分を使うよ。途中でやめても今日は終了。</p></section><div class="hero-sticker" aria-hidden="true"><small>今日のチャレンジ</small><strong>目指せ、<br><em>自己ベスト！</em></strong><span>1 LAP CHALLENGE</span></div></div><section class="garage"><div class="garage-heading"><div><span class="section-label">クラスを解放しよう</span><h2>がんばるほど、もっと速く。</h2></div><div class="master-counter">マスター <strong>${this.masterCount}</strong><span>/ 11チーム</span></div></div><div class="class-grid">${[['easy','50','はじめの一歩','最初から使える'],['normal','100','もっと速く！','5チームをマスター'],['hard','150','最速の世界へ','全11チームをマスター']].map(([key,cc,label,condition])=>{const unlocked=this.classes.includes(key); return `<article class="class-card class-${key} ${unlocked?'unlocked':'locked'}"><span class="class-state">${unlocked?'✓ 解放ずみ':'🔒 ロック中'}</span><div class="engine-class">${cc}<small>cc</small></div><div class="class-description"><strong>${label}</strong><span>${condition}</span></div><div class="class-speed" aria-hidden="true">${[1,2,3,4,5].map((v)=>`<i class="${v <= (key==='easy'?2:key==='normal'?4:5)?'lit':''}"></i>`).join('')}</div></article>`;}).join('')}</div><details class="portal-rules"><summary>あそぶ前に ・ 操作とルール <span>＋</span></summary><div><p>アクセル：↑ / W　ハンドル：← → / A D　ドリフト：スペース　アイテム：E　ひと休み：Esc</p><p>1周完走でタイムを記録。相手は友だちの名前を借りたCPUで、実際の友だちの走りではないよ。</p></div></details></section>`);
      panel.querySelector('#kart-ranking').onclick = () => this.showRanking();
      return await new Promise(resolve => {
        const enter=panel.querySelector('#kart-enter');
        if (enter) enter.onclick = () => { panel.hidden=true; resolve(true); };
        else resolve(false);
      });
    } catch(e) { show(`<p>${text(e.message)}</p><button class="btn" id="retry-init">もう一度確認する</button>`); panel.querySelector('#retry-init').onclick=()=>location.reload(); return false; }
  },
  async begin(raceClass) {
    if (starting) return false;
    if (runId) { await this.showRanking(); return false; }
    starting=true;
    requestId ||= crypto.randomUUID();
    try {
      const r=await call('startKartRace',requestId,raceClass); runId=r.raceId; selectedClass=raceClass;
      return true;
    } catch(e) { show(`<p>${text(e.message)}</p><button class="btn" id="back-select">レーサー選択にもどる</button>`); panel.querySelector('#back-select').onclick=()=>{panel.hidden=true;}; return false; }
    finally { starting=false; }
  },
  finish(seconds) {
    if (!runId) return;
    pending={owner:token,raceId:runId,timeMs:Math.round(seconds*1000)};
    try { localStorage.setItem(pendingKey,JSON.stringify(pending)); } catch {}
    savePending();
  },
  async showRanking(raceClass=selectedClass) {
    selectedClass=raceClass;
    show('<p>タイムランキングをよみこみ中…</p>');
    try {
      if (pending) await savePending();
      const r=await call('getKartRanking',raceClass);
      if (raceClass!==selectedClass) return;
      show(`<div class="ranking-heading"><span class="section-label">みんなのベストタイム</span><h2>🏆 ${classNames[selectedClass]}・1周 タイムランキング</h2></div><div class="ranking-board"><p>${Object.entries(classNames).map(([key,label])=>`<button class="btn" data-rank-class="${key}" ${key===selectedClass?'disabled':''}>${label}</button>`).join(" ")}</p><p>ひとりにつき自己ベスト。速い順に50人まで。同じタイムは同じ順位。</p>${r.me ? `<p>あなたのベスト：${r.me.rank}位 ／ ${time(r.me.timeMs)}</p>` : '<p>あなたの記録はまだないよ。</p>'}<table style="width:100%;text-align:left"><thead><tr><th>順位</th><th>名前</th><th>タイム</th><th>日付</th></tr></thead><tbody>${r.rows.map(row=>`<tr style="${row.mine?'color:#fde047;font-weight:bold':''}"><td>${row.rank}位</td><td>${text(row.name)}</td><td>${time(row.timeMs)}</td><td>${text(row.date)}</td></tr>`).join('')}</tbody></table>${r.rows.length?'':'<p>まだ記録がないよ。最初の完走をめざそう！</p>'}<button class="btn" id="rank-refresh">ランキングを更新</button>${!runId?'<button class="btn" id="rank-back">レースの案内にもどる</button>':''}</div>`);
      panel.querySelectorAll('[data-rank-class]').forEach(button=>{ button.onclick=()=>this.showRanking(button.dataset.rankClass); });
      panel.querySelector('#rank-refresh').onclick=()=>this.showRanking();
      const back=panel.querySelector('#rank-back'); if(back) back.onclick=()=>location.reload();
    } catch(e) { show(`<p>${text(e.message)}</p><button class="btn" id="rank-retry">もう一度よみこむ</button>`); panel.querySelector('#rank-retry').onclick=()=>this.showRanking(); }
  }
};
