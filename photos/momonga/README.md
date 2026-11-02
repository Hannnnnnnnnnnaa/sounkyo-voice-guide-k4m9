# エゾモモンガの表示素材

AIで作ったオリジナルのイメージ（ChatGPT）。写真をもとにした素材ではありません。
設定シートと元のPNGはこのリポジトリに入れません。

`stand / wave / crouch / jump / glide / land / think / surprise / sleepy / yuagari.webp`
の10枚。透過を保った640pxのWebP、1枚100KB以下です。
`think` は素材として用意し、今回の自動移動には使っていません。

素材を差し替えるときは、リポジトリ外のPNGフォルダを指定して
`python tools/prepare_momonga.py /path/to/momonga` を実行します。
作業時だけPillowが必要で、サイトにはライブラリを追加しません。
`standmomonga.png` は `stand.webp` として取り込みます。

## 動きと表示領域

`momonga.js` と `momonga.css` をトップ・場所ページで共有します。
本文はスクロールできる領域に収め、その下の136pxをキャラクター用の余白として確保。
キャラは80pxで、余白内の左右のすみを行き来します。
本文、リンク、地図、再生ボタンの上を横切りません。
休ませるとキャラを隠し、余白は操作ボタン用の52pxになります。

登場2秒 → stand。10〜20秒後に crouch → jump → glide → land → stand。
着地の35%で桶が落ちた姿を1秒長く見せます。
45秒操作がなければsleepy、本文のスクロールやタップで起きます。
タップはsurprise → wave。動きを減らす設定では常にstandです。
休ませる設定は `sounkyo-guide:momonga-resting` に保存し、保存できない環境でもページ内で動きます。

## セリフはNotionの用意ができてから

画面は `guide.json` の `momonga_lines` 配列だけを読みます。
未登録・空・不正な値の場合、吹き出しは出しません。仮のセリフはありません。
要素は `{ "text": 日本語の承認済み文章, "text_en": 英語の承認済み文章 }`。
日本語の文字列だけの配列にも対応します。英語が空なら日本語のままです。
HTMLとして解釈せず、文章として表示します。

Notion「モモンガのセリフDB」の列と公開する行の条件は、はな・Claude側で決定してください。
その後、既存のNotion書き出し `tools/notion_export.json` に `momonga_lines` を含めると、
`tools/build.py` がそのまま `guide.json` へ渡します。
`--notion` の直接取得から新DBを読む接続は、DB IDと列が決まってから追加する必要があります。
今回はDBの列を推測せず、取得キーを探さず、生成物の `guide.json` を手で変更していません。

## 確認

ローカルでこのリポジトリを配信し、Playwrightを作業用の場所にインストールしてから、
`PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tools/check_momonga.mjs`。
既定の確認先は `http://127.0.0.1:8766`（`BASE_URL`で変更可）。
Chromeを使い、390px/1280px、日本語/英語、ダークモード、動きを減らす設定を確認します。
結果と撮影画像はgit管理外の `artifacts/momonga/` に出ます。
