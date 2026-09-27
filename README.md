# ROOM STUDY — 1LDK 3Dビューア v1.0

添付の間取り図と内覧動画を参考に、このチャット内で生成した3Dモデルと静的Webビューアです。
**完成ファイルを同梱しています。公開するだけなら npm install・ビルド・Three.js ZIPの再添付は不要です。**

## 最初に

- **推定・概略モデル**です。計測済みの物件データ、写真測量、LiDARスキャンではありません。
- GitHub Pagesで公開しています: https://namihira33.github.io/room-viewer/
- 元動画、元の間取り画像、動画フレーム、人物、位置情報、住所・物件名は、この配布物には入れていません。
- ただし、室内の間取りそのものは個人情報になり得ます。公開してよいか確認してください。
- `noindex` と `robots.txt` は検索エンジンへの要請にすぎず、アクセス制限ではありません。
- iPhone実機、Safari/WebKit、LINEアプリ、AR Quick Lookでの動作は未検証です。後述のChromium検証とは区別してください。

## 1. GitHub Pagesで公開する（ビルド不要）

この配布物の公開先: https://namihira33.github.io/room-viewer/

別のリポジトリに配置する場合は、次の手順を使ってください。

1. ZIPを解凍します。GitHubに `room-viewer` などの名前の新しいリポジトリを作ります。無料の通常の利用なら公開リポジトリを使います。
2. 解凍した**中身**をリポジトリの一番上にアップロードします。`index.html`、`viewer.js`、`styles.css` と `models/`、`assets/`、`vendor/`、`source/` を同じ階層に置いてください。
   - ZIPファイルそのものをアップロードしてもWebサイトにはなりません。
   - フォルダの中身を平らにしないでください。フォルダ構成を保ちます。
   - `source/model.js` はビューアでも使うため、`source/` を省略しないでください。
   - `.nojekyll` も同梱しています。隠しファイルなので、ブラウザアップロードで含まれない場合はGitHub上で同名の空ファイルを作成できます。
   - `checks/` と `tools/` は公開ビューアの動作には不要です。確認画像・再実行用として残しても構いません。
3. リポジトリの **Settings → Pages → Build and deployment** を開きます。
4. **Source: Deploy from a branch**、**Branch: main**、**Folder: /(root)** を選び、Saveを押します。
5. GitHub側の配信が完了したら、Pages欄に出る実際のURLを開きます。次の形になります。

```text
https://YOUR_NAME.github.io/room-viewer/
```

6. 先に自分のiPhoneで回転・拡大を確認し、それからLINEにURLを送ってください。ビューア最下部の「共有リンクをコピー」も使えます。

```text
https://YOUR_NAME.github.io/room-viewer/?openExternalBrowser=1
```

`openExternalBrowser=1` はLINEから外部ブラウザで開くための指定です。Safariを強制指定するものではありません。ARが開かない場合はSafariで開き直してください。

**公開設定の注意:** 通常のGitHub Pagesは、元のリポジトリが非公開でもサイト自体は公開される場合があります。家族だけのアクセス制限にはなりません。認証画面風のHTMLを付けるだけではGLB・USDZ本体を保護できません。

## 2. 公開前にPCで開く

このフォルダでターミナルを開き、次のどちらかを実行します。

Windows:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

macOS / Linux:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

ブラウザで次を開きます。

```text
http://127.0.0.1:8000/
```

または、同梱の `tools/serve.py` を実行しても同じです。

```powershell
py tools/serve.py
```

HTMLをダブルクリックした `file://` ではモジュール・GLB読み込みが制限されるため、上記のローカルサーバーを使ってください。外部CDN、アクセス解析、広告、APIキー、MCP接続は使いません。

## 3. ビューアの操作

| 操作 | 内容 |
|---|---|
| ドラッグ / 1本指 | 回転 |
| ホイール / 2本指ピンチ | 拡大・縮小 |
| 右ドラッグ / 2本指ドラッグ | 平行移動 |
| 全体を見る / 戻す | 最初の俯瞰視点に戻る |
| 真上 | 間取りが読みやすい上方視点 |
| LDK・洋室 | 室内側の視点に切り替える |
| 水まわり・玄関 | 該当箇所に寄った俯瞰視点 |
| 壁を低く | 上部の壁・建具などを非表示。通常の壁高に戻すことも可能 |
| 自動回転 | モデルの周りをゆっくり回る |
| 部屋名 | 俯瞰 / 真上でのラベル表示を切り替える |
| 模型をARで見る | `model-mini.usdz`（1:10・低い壁）を開く |
| 右上の i | 仮定、注意点、GLB / USDZリンク |

室内モードもOrbitControlsによる視点操作です。衝突判定付きの一人称ウォークスルーではなく、壁を通り抜ける視点になることがあります。「戻す」で復帰できます。

## 4. モデルファイル

| ファイル | 内容 |
|---|---|
| `models/model.glb` | 約2.69 MB。通常の壁高・天井なし。Web閲覧、Blender等への受け渡し用。画像5枚を内部に格納した単一ファイル |
| `models/model.usdz` | 約6.62 MB。GLBと同じ元モデル・推定実寸。天井なし・通常の壁高 |
| `models/model-mini.usdz` | 約4.99 MB。同じ形状から派生した1:10模型。上部の壁・建具等を省略。家族向けARボタンの既定値 |
| `assets/rotation-preview.mp4` | 7秒・720×720・24fps・H.264・無音の回転プレビュー。生成モデルだけを撮影した動画 |
| `assets/preview.jpg` | 実際のGLBを再読み込みして描画した確認画像 |
| `checks/01-overview.png` など | 俯瞰、上方、四方向、通常壁高、各室の確認PNG |

実寸版は大きな建物模型です。通常は1:10版の方が机や床で扱いやすくなります。1:10版は水平寸法が約0.62 × 0.72 mです。Quick Look側での初期表示サイズや配置の見え方は実機で確認してください。

## 5. 形状と寸法の仮定

間取り図から読み取れる **LDK 10.4帖、洋室6帖、各室の配置**を優先しました。メートル単位の寸法線がないため、帖数と画像の比率を手がかりに全体寸法を仮定しています。帖数と内部の有効面積が厳密に一致するような実測モデルではありません。

| 項目 | このモデルの設定 / 判断 |
|---|---|
| 基本平面 | 基準線外形 約6.0 × 7.0 m、図の左上側に欠き込みのあるL形 |
| 実際の形状の外接寸法 | 約6.21 × 7.21 m。窓枠・見切りの張り出しを含む |
| LDK側の幅・奥行 | 基準線で約4.90 × 3.80 m。玄関等を含む外接範囲 |
| 洋室 | 基準線で約3.10 × 3.20 m |
| 浴室 | 基準線で約2.15 × 1.60 m |
| 天井高 | 仕上げ床から2.40 mと仮定。天井板・屋根は表示用に省略 |
| 建具 | 高さ約2.00〜2.05 m。開き角・引戸の開き具合は説明用の固定状態 |
| 壁厚 | 外壁0.15 m、内壁0.10 m |
| 床座標 | スラブ底面 Y=0、居室の仕上げ床 Y=0.18 m、玄関は約0.07 m低い |
| 軸・単位 | Y-up、1 unit = 1 m。図の右を+X、図の下を+Zとしてから中心化 |
| 壁を低くした状態 | 仕上げ床から約1.02 mを境に分割。高い設備の一部も非表示 |
| 窓 | 開口の位置は主に間取り図、キッチン等は動画も参照。高さ・幅は仮定 |
| 設備 | 外観を簡略化。メーカーのCADや製品実寸を使用していない |
| 周辺 / バルコニー | 根拠が十分でないため追加していない |
| 家具 | 空室として制作。冷蔵庫や洗濯機は置かず、スペース・洗濯機パンのみ |

## 6. 動画の使用方法

`IMG_0494.MOV`（約100.70秒）から、全域を約4秒間隔で確認する25フレームと、設備の確認用30フレーム、合計55フレームを抽出して目視しました。音声の書き起こしや全フレームの精査は行っていません。

- 玄関付近：グレー系タイル、茶色のシューズ収納、グレーの玄関扉。
- 居室 / キッチン：茶色のフローリングと建具、白系壁、白いキッチン、ステンレス天板、黒いIH、レンジフード、窓。
- 水まわり：白い便器、三面鏡付き洗面台、洗濯機パン、浴槽、濃い茶色の浴室アクセント壁、鏡・シャワー。
- 洋室：窓、エアコン、茶色の引戸・収納建具。

仕上げ色は映像を参考にした近似です。撮影時の色温度や照明を校正していないため、実物の色と一致は保証できません。撮影者や私物、文字入りの掲示物は再現していません。詳細は `source/reference-notes.md` を参照してください。

## 7. 再生成・変更

ローカルサーバーを起動して、次を開きます。

```text
http://127.0.0.1:8000/source/generate.html
```

または:

```text
http://127.0.0.1:8000/?source=1
```

このモードでは `source/model.js` からThree.jsオブジェクトを再生成します。左下の「制作モード：3形式を生成」でGLB、USDZ、1:10 USDZをダウンロードします。ブラウザが複数ファイルの保存許可を求めた場合は許可してください。保存後、`models/` の3ファイルを置き換えます。

- `source/model.js`: 材質、形状、開口、設備、寸法設定。
- `PARAMETERS`: 天井高、壁厚、仕上げ床高、切断高、AR縮尺等。ただし平面座標も実装内に記述しているため、幅・奥行の大変更では形状座標も合わせて修正してください。
- `viewer.js`: カメラ、描画、操作、書き出し処理。
- `styles.css`: PC / スマートフォンの画面構成。
- テクスチャはCanvasから決定的な乱数で生成。元の写真ファイルや外部画像は不要です。
- ユーザーが添付したThree.js ZIPの **r186** を同梱・固定しています。現在の最新バージョンだと主張するものではありません。
- `GLTFExporter`: `binary: true`, `onlyVisible: true`, `maxTextureSize: 2048`。
- `USDZExporter`: `quickLookCompatible: true`, `onlyVisible: true`, `maxTextureSize: 2048`。
- プレゼン用の背景・影受け平面、照明、部屋名ラベルはモデルへ書き出しません。建築の床スラブはモデル本体として含みます。

## 8. 実施した検証と未確認項目

**実施:** Three.jsによる実生成、GLB / USDZ / 小型USDZの実出力、GLB再読み込み、同一視点での生成元との描画比較、12方向 / 室内のPNG確認、PCと390 × 844のスマートフォン幅の表示、回転・拡大・各種ボタン、Chromiumへの模擬タッチ入力によるピンチ、GLB内部画像・数値・インデックス・参照範囲、USDZのZIP CRC・無圧縮・64バイト境界・レイヤー参照・単位 / 軸。

ブラウザ検証は、この実行環境のネットワーク制限に合わせ、**同梱HTML / JavaScript / GLBをメモリからChromiumへ供給**して行いました。ブラウザの通信制限や管理設定は変更していません。実際の公開URLをブラウザで開く検証とは別です。HTTPでのファイル供給と相対パスも別途機械的に確認しています。

**未実施:** iPhone実機、Safari/WebKit、LINEアプリのブラウザ、AR Quick Lookでのネイティブ表示、AppleのUSDコンプライアンスツール、公式Khronos validator、GitHubへのアップロード・実公開、現地寸法照合、全フレーム / 音声解析。

検証ログ: `checks/format-validation.json`, `checks/browser-ui-validation.json`, `checks/roundtrip-validation.json`, `checks/static-site-validation.json`。

## 9. 公開後の最小チェック

自分のiPhoneでページを開き、モデルが表示されるか、指で回るか、ピンチできるかを確認してください。次に「模型をARで見る」を押し、部屋の床や机に配置できるか、壁の切断や材質が不自然でないかを確認してください。最後にLINEで自分へ送ったURLから同じ操作を確認してください。

不具合時は、URL・iOSバージョン・SafariかLINE内ブラウザか・画面のスクリーンショットを記録すると原因を切り分けやすくなります。

## 公式資料

- GitHub Pages 公開元の設定: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Three.js USDZExporter: https://threejs.org/docs/pages/USDZExporter.html
- Three.js GLTFExporter: https://threejs.org/docs/pages/GLTFExporter.html
- Apple AR Quick Look: https://developer.apple.com/quick-look-gallery/
- LINE URL scheme: https://developers.line.biz/en/docs/line-login/using-line-url-scheme/

Third-partyライセンスは `THIRD_PARTY_LICENSES.md` と `vendor/three/LICENSE.txt` を参照してください。元の資料の権利を再配布するものではありません。
