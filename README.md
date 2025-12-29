# sharp-image-optimizer

プロ仕様の画像一括変換ツール（sharp ベース）

## 特徴

- **高速処理**: Node.js の [sharp](https://sharp.pixelplumbing.com/) を使用した高速な画像処理
- **複数フォーマット対応**: WebP、AVIF、SVG、SVGZ など現代的な画像フォーマットに対応
- **最適化機能**: 画質を保ちながらファイルサイズを削減
- **並列処理**: 複数ファイルの同時処理で効率的な変換
- **キャッシュ機能**: 変更のないファイルをスキップして処理時間を短縮
- **柔軟な設定**: コマンドラインオプションまたは設定ファイルで細かくカスタマイズ可能

## インストール

```bash
npm install
npm run build
```

## 使い方

### 基本的な使い方

```bash
# 画像を最適化して出力
npm start -- -i ./src/images -o ./dist/images -m

# または CLI コマンドを直接使用
node dist/bin/cli.js -i ./src/images -o ./dist/images -m
```

### WebP 変換

```bash
# WebP形式に変換
npm start -- -i ./src/images -o ./dist/images -w

# 元のファイルも最適化して残す
npm start -- -i ./src/images -o ./dist/images -m -w
```

### AVIF 変換

```bash
# AVIF形式に変換
npm start -- -i ./src/images -o ./dist/images -f

# WebPとAVIF両方に変換
npm start -- -i ./src/images -o ./dist/images -w -f
```

### 包括的な最適化

```bash
# 全てのオプションを有効化してキャッシュも使用
npm start -- -i ./src/images -o ./dist/images -w -m -f --cache
```

## コマンドラインオプション

### 必須オプション

| オプション | 説明 |
|-----------|------|
| `-i, --input <dir>` | ソースディレクトリ（必須） |
| `-o, --out <dir>` | 出力先ディレクトリ（必須） |

### 変換オプション

| オプション | 説明 |
|-----------|------|
| `-m, --minify` | 画像の最適化を行う（同一拡張子での変換） |
| `-w, --webp` | WebP 形式に変換する |
| `-a, --webp-suffix-add` | WebP 変換時、拡張子を追加する（例: image.jpg.webp） |
| `-f, --avif` | AVIF 形式に変換する |
| `-s, --avif-suffix-add` | AVIF 変換時、拡張子を追加する（例: image.jpg.avif） |
| `-v, --svg` | SVG の最適化を行う（SVGO 使用） |
| `-z, --svgz` | SVGZ（gzip 圧縮）を出力する |
| `-n, --nosvg` | SVGZ 出力時、SVG は出力しない |
| `-g, --gif` | GIF を変換対象に含める |

### その他のオプション

| オプション | 説明 |
|-----------|------|
| `-t, --truncate` | 出力先ディレクトリを空にしてから処理 |
| `-c, --concurrency <number>` | 並列処理数（デフォルト: 4） |
| `--cache` | キャッシュを有効化（変更のないファイルをスキップ） |
| `--cache-dir <dir>` | キャッシュディレクトリ（デフォルト: .image-cache） |
| `--force` | キャッシュを無視して再処理 |
| `--config <path>` | 設定ファイルのパス |
| `--fail-fast` | エラー発生時に即座に終了 |
| `--no-color` | カラー出力を無効化 |
| `--dry-run` | 実際に変換せず、対象ファイルを表示 |

## 使用例

### 例1: 基本的な画像最適化

```bash
npm start -- -i ./images -o ./optimized -m
```

画像を最適化して、元のフォーマットのまま出力します。

### 例2: モダンなフォーマットへの変換

```bash
npm start -- -i ./images -o ./optimized -w -f -m
```

元の画像を最適化し、さらに WebP と AVIF フォーマットも生成します。

### 例3: キャッシュを使った効率的な処理

```bash
npm start -- -i ./images -o ./optimized -w -m --cache
```

2回目以降は変更のあったファイルのみ処理されます。

### 例4: ディレクトリをクリーンアップして処理

```bash
npm start -- -i ./images -o ./optimized -w -m -t
```

出力ディレクトリを空にしてから処理を開始します。

### 例5: Dry run（確認モード）

```bash
npm start -- -i ./images -o ./optimized -w -m --dry-run
```

実際に変換せず、どのファイルがどのように処理されるかを確認できます。

## プロジェクト構造

```
sharp-image-optimizer/
├── bin/
│   └── cli.ts          # CLIエントリーポイント
├── src/
│   ├── index.ts        # メインロジック
│   ├── cache.ts        # キャッシュ管理
│   ├── config.ts       # 設定ファイル読み込み
│   ├── defaults.ts     # デフォルト設定
│   ├── logger.ts       # ログ出力
│   ├── planning/       # 処理計画の構築
│   ├── processors/     # 各種プロセッサ
│   └── utils/          # ユーティリティ
├── package.json
└── tsconfig.json
```

## 技術スタック

- **TypeScript**: 型安全な開発
- **sharp**: 高速な画像処理ライブラリ
- **SVGO**: SVG最適化
- **commander**: CLIフレームワーク
- **p-limit**: 並列処理の制御

## 動作要件

- Node.js >= 18.0.0

## 開発

### ビルド

```bash
npm run build
```

### Watch モード

```bash
npm run dev
```

### テスト実行

```bash
npm test
```

## ライセンス

MIT
