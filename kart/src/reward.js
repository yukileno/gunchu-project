// 投稿アプリと同じオリジンで配信する。本人の合言葉をURLへ含めない。
const API_URL = 'https://script.google.com/macros/s/AKfycbxT6Jjil7opkd7scCr2HgE6b4g2WmrEtSXzb8WAM6prJtJSV_MCD07MFLpdM508BTzopQ/exec';
const token = (() => { try { return localStorage.getItem('gunpro_token_v1') || ''; } catch { return ''; } })();
const pendingKey = 'gunpro_kart_pending_v1';
const text = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = ms => `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(Math.floor(ms/10)%100).padStart(2,'0')}`;
const classNames={easy:'50cc',normal:'100cc',hard:'150cc'};
const rankingKey='gunpro_kart_ranking_v2';
const today=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
let rankingTimer=null, rankingVisibility=null, savingPromise=null;
let panel, runId, requestId, starting = false, pending = null, saving = false;
async function call(fn, ...args) {
  const response = await fetch(API_URL, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({fn,args:[token,...args]})});
  if (!response.ok) { const error=new Error('通信できなかったよ。接続を確認してね'); error.retryable=response.status===429 || response.status>=500; throw error; }
  let result;
  try { result=await response.json(); } catch { const error=new Error('サーバーが混み合っているよ。少し待ってね'); error.retryable=true; throw error; }
  if (!result.ok) { const error=new Error(result.error || 'もう一度ためしてね'); error.code=result.code; throw error; }
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
async function retryCall(fn,...args) {
  for(let attempt=0;attempt<4;attempt++) {
    try { return await call(fn,...args); }
    catch(error) {
      if(attempt===3 || (error.code!=='BUSY' && !error.retryable && !(error instanceof TypeError))) throw error;
      await new Promise(resolve=>setTimeout(resolve,800*Math.pow(2,attempt)+Math.random()*1800));
    }
  }
}
async function savePending() {
  if(savingPromise) return savingPromise;
  if(!pending) return false;
  savingPromise=(async()=>{
    saving=true;
    show('<div class="ranking-heading"><span class="section-label">ゴール！</span><h2>完走おめでとう！</h2></div><div class="ranking-board"><p>タイムを保存しています…</p><p>このあと3クラスのランキングを10秒間表示するよ。</p></div>');
    try {
      // 同じ授業時間に一斉完走しても、送信開始を分散する。
      await new Promise(resolve=>setTimeout(resolve,Math.random()*2500));
      pending.viewRequestId ||= crypto.randomUUID();
      try {localStorage.setItem(pendingKey,JSON.stringify(pending));} catch {}
      const r=await retryCall('finishKartRace',pending.raceId,pending.timeMs,pending.viewRequestId);
      pending=null;
      try { localStorage.removeItem(pendingKey); } catch {}
      note('✅ タイムを保存したよ！');
      reward.showRanking(r.ranking);
      return true;
    } catch(e) {
      show(`<div class="ranking-heading"><h2>タイムを保存できませんでした</h2></div><div class="ranking-board"><p>${text(e.message)}</p><p>記録を端末に残しているので、次に開いたときにも保存をためすよ。</p><button class="btn" id="retry-save">保存をもう一度ためす</button></div>`);
      panel.querySelector('#retry-save').onclick=()=>savePending();
      return false;
    } finally {saving=false;savingPromise=null;}
  })();
  return savingPromise;
}
export const reward = {
  name:'あなた', opponents:[], classes:['easy'], masterCount:0,
  async init() {
    show('<p>今日の報告とレース券を確認中…</p>');
    try {
      if (!token) { show('<p>先に報告画面で登録してね。</p>'); return false; }
      try { const viewed=JSON.parse(localStorage.getItem(rankingKey)); if(viewed?.owner===token && viewed.day===today()) { this.showRanking(viewed.ranking); return false; } } catch {}
      // 保存待ちは本人が一致する場合だけ再送する。
      try { const p=JSON.parse(localStorage.getItem(pendingKey)); if (p && p.owner===token) pending=p; } catch {}
      if (pending) { await savePending(); return false; }
      const status = await call('getKartStatus');
      this.name = status.name; this.opponents = status.opponents; this.classes=status.classes || ['easy']; this.masterCount=status.masterCount || 0;
      const playable = status.posted && !status.used && status.opponents.length;
      const statusTitle = status.used ? '今日のレースは終了！' : !status.posted ? '報告して、レースへ！' : !status.opponents.length ? '友だちの参加を待とう' : '今日のレース券、ゲット！';
      const statusCopy = status.used ? 'また明日、報告して走ろう。' : !status.posted ? '今日のできたことを報告すると遊べるよ。' : !status.opponents.length ? '相手になる友だちがまだ登録されていないよ。' : 'がんばった自分に、ごほうびの1周を。';
      show(`<div class="lobby-hero"><section class="lobby-copy"><div class="portal-eyebrow"><span class="eyebrow-line"></span> 毎日のがんばりが、走るチカラに。</div><h1 class="rally-logo"><span>郡中</span><strong>カートラリー<span class="logo-star">★</span></strong></h1><p class="hero-description">報告したら、サーキットへ。<br>自分だけのベストタイムをたたき出そう！</p><div class="race-status"><span class="status-icon">${playable ? '✓' : '！'}</span><div><strong>${statusTitle}</strong><p>${statusCopy}</p></div><span class="daily-badge">1日1回</span></div><div class="lobby-actions">${playable ? '<button class="portal-start" id="kart-enter"><span class="button-flag">▚</span> レーサーをえらぶ <span class="button-arrow">▶</span></button>' : '<a class="portal-start" href="../">報告画面へ <span class="button-arrow">▶</span></a>'}<div class="portal-rank-button ranking-rule"><span>🏆</span> ランキングは完走後に1日1回・10秒間</div></div><p class="start-note">レース開始で1回分を使うよ。途中でやめても今日は終了。</p></section><div class="hero-sticker" aria-hidden="true"><small>今日のチャレンジ</small><strong>目指せ、<br><em>自己ベスト！</em></strong><span>1 LAP CHALLENGE</span></div></div><section class="garage"><div class="garage-heading"><div><span class="section-label">クラスを解放しよう</span><h2>がんばるほど、もっと速く。</h2></div><div class="master-counter">マスター <strong>${this.masterCount}</strong><span>/ 11チーム</span></div></div><div class="class-grid">${[['easy','50','はじめの一歩','最初から使える'],['normal','100','もっと速く！','5チームをマスター'],['hard','150','最速の世界へ','全11チームをマスター']].map(([key,cc,label,condition])=>{const unlocked=this.classes.includes(key); return `<article class="class-card class-${key} ${unlocked?'unlocked':'locked'}"><span class="class-state">${unlocked?'✓ 解放ずみ':'🔒 ロック中'}</span><div class="engine-class">${cc}<small>cc</small></div><div class="class-description"><strong>${label}</strong><span>${condition}</span></div><div class="class-speed" aria-hidden="true">${[1,2,3,4,5].map((v)=>`<i class="${v <= (key==='easy'?2:key==='normal'?4:5)?'lit':''}"></i>`).join('')}</div></article>`;}).join('')}</div><details class="portal-rules"><summary>あそぶ前に ・ 操作とルール <span>＋</span></summary><div><p>アクセル：↑ / W　ハンドル：← → / A D　ドリフト：スペース　アイテム：E　ひと休み：Esc</p><p>1周完走でタイムを記録。相手は友だちの名前を借りたCPUで、実際の友だちの走りではないよ。</p></div></details></section>`);
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
      const r=await retryCall('startKartRace',requestId,raceClass); runId=r.raceId;
      return true;
    } catch(e) { show(`<p>${text(e.message)}</p><button class="btn" id="back-select">レーサー選択にもどる</button>`); panel.querySelector('#back-select').onclick=()=>{panel.hidden=true;}; return false; }
    finally { starting=false; }
  },
  finish(seconds) {
    if (!runId) return;
    pending={owner:token,raceId:runId,timeMs:Math.round(seconds*1000),viewRequestId:crypto.randomUUID()};
    try { localStorage.setItem(pendingKey,JSON.stringify(pending)); } catch {}
    savePending();
  },
  showRanking(ranking) {
    clearInterval(rankingTimer);
    if(rankingVisibility) document.removeEventListener('visibilitychange',rankingVisibility);
    if(!ranking) {
      try { const cached=JSON.parse(localStorage.getItem(rankingKey)); if(cached?.owner===token && cached.day===today()) ranking=cached.ranking; } catch {}
    }
    if(!ranking || ranking.expired || !ranking.boards || ranking.expiresAt<=Date.now()) {location.replace('../');return;}
    try {localStorage.setItem(rankingKey,JSON.stringify({owner:token,day:today(),ranking}));} catch {}
    const seconds=Math.max(0,Math.ceil((ranking.expiresAt-Date.now())/1000));
    show(`<div class="ranking-heading ranking-heading-timed"><div><span class="section-label">完走おめでとう！ ・ 今日のごほうび</span><h2>🏆 みんなのタイムランキング</h2></div><div class="ranking-countdown"><strong id="ranking-seconds">${seconds}</strong><span>秒後に<br>報告画面へ</span></div></div><p class="ranking-info">50cc・100cc・150ccの自己ベスト上位10人。ランキングは1日1回、10秒間だけ見られるよ。</p><div class="ranking-three">${Object.entries(classNames).map(([key,label])=>{
      const board=ranking.boards[key] || {rows:[],me:null};
      return `<section class="ranking-board"><h3>${label}<small>1周 タイムランキング</small></h3><div class="ranking-personal">${board.me?`あなたのベスト <strong>${board.me.rank}位 ・ ${time(board.me.timeMs)}</strong>`:'このクラスの記録はまだないよ'}</div><table><thead><tr><th>順位</th><th>名前</th><th>タイム</th></tr></thead><tbody>${board.rows.map(row=>`<tr class="${row.mine?'ranking-mine':''}"><td>${row.rank}位</td><td>${text(row.name)}</td><td>${time(row.timeMs)}</td></tr>`).join('')}</tbody></table>${board.rows.length?'':'<p>まだ記録がないよ。</p>'}</section>`;
    }).join('')}</div><p class="ranking-info">同じタイムは同じ順位。タイムの保存は完了しています。</p><a class="portal-back" href="../">今すぐ報告画面へもどる →</a>`);
    const tick=()=>{
      const left=Math.max(0,Math.ceil((ranking.expiresAt-Date.now())/1000));
      const counter=document.getElementById('ranking-seconds');if(counter)counter.textContent=left;
      if(!left){clearInterval(rankingTimer);location.replace('../');}
    };
    rankingVisibility=()=>{if(!document.hidden)tick();};
    document.addEventListener('visibilitychange',rankingVisibility);
    rankingTimer=setInterval(tick,200);tick();
  }
};
