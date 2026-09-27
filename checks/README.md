# 確認画像と検証ログ

画像は外部の画像生成サービスによるイメージ図ではなく、実際のモデルをThree.js / Chromiumで描画した結果です。
`01-overview.png` は最終GLBを再読み込みした画像です。

- 01: 斜め俯瞰、低い壁
- 02: 真上からの配置確認
- 03: 図の下側（+Z）から
- 04: 図の上側（-Z、玄関側）から
- 05: 図の左側（-X）から
- 06: 図の右側（+X）から
- 07: 通常の壁高、天井なし
- 08: LDK内からキッチンへ
- 09: 洋室から収納側へ
- 10: 浴室内
- 11: 水まわり俯瞰
- 12: 玄関側俯瞰
- viewer-desktop: デスクトップのビューア画面
- viewer-mobile: 390×844のスマートフォン幅をChromiumで模擬した画面（実機撮影ではない）

上下左右は間取り図上の方向です。地理的な方角を断定していません。

`roundtrip-validation.json` は生成元と再読込GLBの描画比較。
`format-validation.json` はGLBの基本数値・参照とUSDZのZIP構造チェック。
`browser-ui-validation.json` はボタン・画面幅・模擬ピンチ等。
`orbit-validation.json` は実際のマウス入力と自動回転によるカメラ変化。
`static-site-validation.json` は相対ファイル参照・ローカルHTTP配信・JS構文。
`video-validation.json` は回転プレビューのコーデック・長さ等。

これらはネイティブAR Quick Look表示、Safari、LINEアプリ、現地寸法の検証の代わりではありません。
