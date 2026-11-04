# 写真の置き方

場所ページ（guide.html）の写真は、ここに季節ごとに置きます。

```
photos/<場所のID>/spring.jpg   春
photos/<場所のID>/summer.jpg   夏
photos/<場所のID>/autumn.jpg   秋
photos/<場所のID>/winter.jpg   冬
```

場所のID：`momijidani-entrance`（紅葉谷）、`momiji-falls`（紅葉の滝）、`ginga-ryusei`（銀河の滝・流星の滝）、`obako`（大函）、`naming-1921`（層雲峡温泉街）

- 景色は、作業フォルダの `02_画像づくり.md` にある参考写真をもとにしたAIのイメージです。トップは16:9、場所ページは元の絵の縦横比を保って掲載します。
- 長い辺は1600px以下。小さい元画像は拡大しません。`-thumb.jpg` は長い辺400px以下で作り直し、両方からEXIF・位置情報・XMPなどを外します。
- `photos/credits.json` はファイルのパスごとに、参考写真番号・撮影者・ライセンス・元ページを持ちます。番号と「そのまま／季節を変える」は画像づくりの表、撮影者などは `参考写真のクレジット.csv` に合わせます。
- 表示は「AIで作ったイメージ／もとの写真：撮影者（ライセンス、改変）」。季節を変えた絵は「AIで作った季節のイメージ」とします。画像を替えたら同じパスのクレジットも更新します。
- まだ絵がない枠は画像・サムネイル・クレジットを外し、「準備中」にします。別の場所や季節の写真では埋めません。
- トップの画像と説明は `top.html` の `HERO_PHOTOS` と `GALLERY` です。場所ページ用の `guide.json` は `python3 tools/build.py --meta-only` で生成し、手では編集しません。

## いきものの写真（シャボン玉）

```
photos/creatures/<いきものDBのページID>.jpg
photos/creatures/credits.json   撮影者・ライセンス・元のページ
```

- 今ある写真の多くは Wikimedia Commons の写真です（CC0・CC BY・CC BY-SA・パブリックドメインのものだけ）。撮影者・ライセンス・元ページへのリンクを、シャボン玉を開いたときに写真の上に出しています。CC BY / CC BY-SA の写真は、この表示が使う条件です。消さないでください。
- 写真は縮小し、撮影場所などの情報（EXIF）を消して置いています。
- 写真を替えるときは、credits.json の同じIDの行も書き換えます（Claudeに頼んでもOK）。
