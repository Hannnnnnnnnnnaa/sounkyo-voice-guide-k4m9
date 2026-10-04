# 写真の置き方

場所ページ（guide.html）の写真は、ここに季節ごとに置きます。

```
photos/<場所のID>/spring.jpg   春
photos/<場所のID>/summer.jpg   夏
photos/<場所のID>/autumn.jpg   秋
photos/<場所のID>/winter.jpg   冬
```

場所のID：`momijidani-entrance`（紅葉谷）、`momiji-falls`（紅葉の滝）、`ginga-ryusei`（銀河の滝・流星の滝）、`obako`（大函）、`naming-1921`（層雲峡温泉街）

- 横長（4:3）で、長い辺が1600px程度に縮めてから置くと軽くなります。
- 自分で撮った写真か、使ってよいと許可をもらった写真だけを置きます。
- 置いたあと `python3 tools/build.py --meta-only` を実行すると、ページに出ます（Claudeに頼んでもOK）。
