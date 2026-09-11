# Conan Casebook

『名探偵コナン』本編に焦点を当てた視聴リスト：**255エピソード、9つの編、個別にソースを確認したIMDbレーティング**。[SawabS](https://github.com/SawabS) により制作。

[Conan Casebook を開く](https://sawabs.github.io/DetectiveConanMainPlot/)

ブラウザで [index.html](index.html) を開くか、[整形済みガイド](https://sawabs.github.io/DetectiveConanMainPlot/guide.html) をご覧ください。Markdown形式のダウンロードも引き続き利用可能です。

- タイトルまたは正確な日本公式話数で検索。
- 編（アーク）、視聴状況、評価で絞り込み。ストーリー順またはスコアで並べ替え。
- 視聴の進捗をお使いのデバイスに保存、次の未視聴エピソードから再開、エピソードタイトルの非表示に対応。
- JSONバックアップのエクスポート／インポート。インポート時は進捗をマージ、リセットには確認が必要です。
- 各エピソードの情報源、IMDbのマッピング、投票数、評価の確認日を詳細に確認。
- 太陽／月ボタンでブルーライトテーマとダークテーマを切り替え。選択は保存され、初回アクセス時はシステムのテーマに従います。
- **ストーリーマップ**の探索：編やエピソードを選択し、マウスやペンでドラッグ、ボタンでズーム、または Ctrl/Command + ホイールを使用。タッチ操作では編の選択、エピソード検索、通常のページスクロールを維持しながらズームコントロールを利用可能。
- 矢印キーでグラフのノード間を移動、Enter/Space で選択、+/− でズーム、Home でリセット。色は編を識別し、チェックマークは視聴済みエピソードを示します。ノードの大きさはエピソードの IMDb 評価を反映しています。破線のリンクは編内の視聴順序を示しており、推測されたプロット上の関連性を示すものではありません。
- 薄い青色のグリッドは、ポインターの周囲でわずかな遅延を伴って柔らかく局所的に歪みます。この効果は精密なポインターで自動的に有効化され、視覚効果の抑制（reduced-motion）設定を尊重し、操作休止時やページが非表示のときは停止します。

## 映画

ナビゲーションバーの**映画**を開くか、[映画ライブラリ](https://sawabs.github.io/DetectiveConanMainPlot/#movies) にアクセスしてください。2026年9月7日時点で確認された、公開済みの劇場版メイン作品29作、劇場版クロスオーバー1作、総集編3作、3Dショート作品2作を網羅しています。タイトル、作品番号、公開年で検索可能。カテゴリーや視聴状況による絞り込み、公開日順での並べ替えに対応しています。映画の進捗管理には専用のローカルストレージとインポート／エクスポート機能が用意されています。

[映画チェックリスト](detective_conan_movies.md) およびブラウザカタログは、個別の情報源とアートワークのクレジットを含む [data/movies.json](data/movies.json) から生成されています。外部のカバー画像はオンデマンドで読み込まれ、利用できない場合でも視認可能なフォールバックを維持します。

## 分析

[分析](https://sawabs.github.io/DetectiveConanMainPlot/#analytics) を開いて、**全255話の厳選された本編エピソード**と**35本の映画作品**を探索できます：

- 各評価や放送時間のバーを選択して、その情報源や投票数を確認。
- 各編の中央値、評価の分布、年別の日本国内放送・公開状況を比較。
- 編／カテゴリー、公開年、進捗、評価帯、最小投票数で絞り込み。
- 保存された進捗状況と1日の視聴時間予算から、残りの視聴時間を計画。
- タイトルの非表示、キーボードによるチャート操作、絞り込んだ行のCSVエクスポートが可能。

全255話のエピソードと33本の映画作品に IMDb スコアがあります。2本のショート作品には検証済みの IMDb の一致データがありません。エピソードの時間は **TVmaze の放送枠掲載情報**であり、広告が含まれている場合があります。これは計画の目安を支援するものであり、正確な配信再生時間を主張するものではありません。詳細は [分析方法とデータ適用範囲](data/analytics-methodology.md) を参照してください。

## 実行方法

リポジトリをダウンロードして `index.html` を開きます。インストールやサーバーは不要です。アートワークとエピソードデータはバンドルされています。オフライン時はWebフォントがシステムフォントへフォールバックします。情報源へのリンクにはインターネット接続が必要です。

安定したローカルオリジンで動かすには、`python3 -m http.server 8000` を実行して `http://localhost:8000` を開きます。進捗データはブラウザのローカルに保存されるため、ブラウザ、オリジン、デバイスを切り替えても引き継がれません。ブラウザデータを移動または消去する前にバックアップをエクスポートしてください。

## メンテナンス

`data/episodes.json` が一次情報源（source of truth）です。確認済みの選定エピソード、日本語タイトル、初放送日、情報源URL、IMDb ID、翻訳タイトル、マッピングメモ、スコア、投票数、確認日が含まれています。

```sh
python3 -m pip install -r scripts/requirements-build.txt # ビルド時のMarkdownレンダラー
python3 scripts/build.py          # Markdownおよびブラウザ用データの生成
python3 scripts/build.py --check  # 更新が必要な生成ファイルを検出
python3 -m unittest discover -s tests -p 'test_*.py' # レンダリングされたガイドとリンクの検証
node --test tests/analytics.test.js # 分析の計算とソースカバレッジの検証
node --test tests/core.test.js    # フィルタリング、進捗、データ整合性の検証
node --test tests/graph.test.js   # グラフのカバレッジ、カメラ境界、テーマフォールバックの検証
node --test tests/grid.test.js    # 局所的な変形境界と静止復帰の検証
node --test tests/movies.test.js  # 映画のカバレッジ、フィルタリング、映画バックアップの検証
python3 scripts/refresh_ratings.py # 同一IDの更新スコアをダウンロード
```

タイトル、放送年、パート番号をもとに、新しいエピソードのマッピングを確認してください。日本の話数から IMDb ID を推測したり、ひとつの事件（事件編）全体で同じレーティングを使い回したりしてはなりません。更新スクリプトは、確認済みの ID を変更することなく、エピソードおよび映画のスコア、投票数、確認日を更新します。初期の修正内容については [CHANGELOG](CHANGELOG.md) を参照してください。

UIはフロントエンドフレームワークを使用せず、ネイティブの HTML、CSS、SVG、Pointer Events で構築されています。共通のカラーパレットは、両テーマにおいてテーブル、コントロール、ダイアログ、ナビゲーション、グラフをカバーしています。実装のリファレンス：[MDN theme preferences](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme)、[backdrop filtering](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)、[Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)。ビジュアルの方向性は [Frontend Design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) を参考にしています。

## 情報源とクレジット

エピソードのメタデータには [Detective Conan World](https://www.detectiveconanworld.com/wiki/Anime)。本編の重要事件および前提エピソードの選定には [XerBlade](https://www.xerblade.com/p/detective-conan-important-episode-list.html)。エピソードのメタデータとレーティングには [IMDb non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/)（IMDbデータにはその利用規約が適用されます）。レーティングは日付付きのスナップショットであり、リアルタイムのスコアではありません。[TVmaze](https://www.tvmaze.com/) は [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) の下で放送時間の掲載情報を提供しており、適合された TVmaze の放送時間フィールドには同ライセンスが保持されます。

[屋上のコナンのキービジュアル](https://www.animeclick.it/news/101509-anime-preview-trailer-e-novita-per-detective-conan-remonster-e-altri-anime) は『名探偵コナンVS.怪盗キッド』（2024年）のプロモーション用です。© 青山剛昌／小学館・読売テレビ・TMS 2024。この画像にオープンライセンスは確認されていません。[アセットのクレジット](assets/CREDITS.md) を参照してください。本プロジェクトは非公式のファンプロジェクトであり、公式との提携や推奨関係はありません。

## 言語

テーマ切り替えの横にある地球儀アイコンから、英語、ソラニー語、アラビア語、日本語を選択できます。これら3つの新しいロケールは**翻訳プレビュー**であり、エージェントによるレビューが完了するまではナビゲーションラベルと英語のフォールバックで表示されます。ソラニー語とアラビア語は RTL と同梱の IBM Plex Sans Arabic を使用し、日本語は IBM Plex Sans JP とシステムのフォールバックフォントを使用します。言語設定は視聴の進捗とは別に保存されます。

翻訳エージェントには [translations/AGENT_PROMPT.md](translations/AGENT_PROMPT.md) を指定してください。[翻訳ディレクトリ](translations/README.md) には、UIテキスト、動的なJavaScript文字列、エピソード／映画コンテンツ、元ドキュメントの編集可能なカタログと完全なインベントリが含まれています。翻訳完了後は `python3 scripts/translations.py` でコンパイルしてください。
