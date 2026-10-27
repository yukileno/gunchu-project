# 郡中プロジェクト（画面）

5年生の活動報告アプリの画面です。データの出し入れは Google Apps Script（API）が担当します。

- `index.html` … 画面本体
- `tailwind.css` … 画面で使う CSS（Tailwind を事前にビルドしたもの）

CSS の作り直し（クラスを増やしたとき）:

    npx tailwindcss@3 -i in.css -o tailwind.css --content index.html --minify

（`in.css` は `@tailwind base; @tailwind components; @tailwind utilities;` の3行）
