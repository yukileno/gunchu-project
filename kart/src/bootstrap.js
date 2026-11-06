import { reward } from './reward.js';

// ランキング・利用状況確認にはWebGLを要求しない。
if (await reward.init()) {
  try { await import('./main.js'); }
  catch (error) {
    console.error(error);
    const message = document.createElement('div');
    message.style.cssText = 'position:fixed;inset:0;z-index:1100;padding:32px;background:#142344;color:white;font:20px sans-serif';
    message.textContent = 'ゲームを読みこめませんでした。インターネット接続と、ブラウザーの3D表示が有効か確認してね。';
    const back = document.createElement('a'); back.href='../'; back.textContent='報告画面へもどる'; back.style.cssText='display:block;color:#a7f3d0;margin-top:24px';
    message.append(back); document.body.append(message);
  }
}
