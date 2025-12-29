#!/usr/bin/env node
/**
 * sharp-image-optimizer CLI
 *
 * 使用例:
 *   sio -i ./src/images -o ./dist/images -w -m --cache
 *   sharp-image-optimizer -i ./src -o ./dist -w -f -m -t
 */

import { Command } from "commander";
import { processImages, type ProcessImagesOptions } from "../src/index.js";
import { DEFAULT_CONCURRENCY, DEFAULT_CACHE_DIR } from "../src/defaults.js";

const program = new Command();

program
  .name("sharp-image-optimizer")
  .description("プロ仕様の画像一括変換ツール（sharp ベース）")
  .version("1.0.0")

  // 必須オプション
  .requiredOption("-i, --input <dir>", "ソースディレクトリ（必須）")
  .requiredOption("-o, --out <dir>", "出力先ディレクトリ（必須）")

  // 変換オプション
  .option("-m, --minify", "画像の最適化を行う（同一拡張子での変換）", false)
  .option("-w, --webp", "WebP 形式に変換する", false)
  .option("-a, --webp-suffix-add", "WebP 変換時、拡張子を追加する（例: image.jpg.webp）", false)
  .option("-f, --avif", "AVIF 形式に変換する", false)
  .option("-s, --avif-suffix-add", "AVIF 変換時、拡張子を追加する（例: image.jpg.avif）", false)
  .option("-v, --svg", "SVG の最適化を行う（SVGO 使用）", false)
  .option("-z, --svgz", "SVGZ（gzip 圧縮）を出力する", false)
  .option("-n, --nosvg", "SVGZ 出力時、SVG は出力しない", false)
  .option("-g, --gif", "GIF を変換対象に含める（デフォルトはコピーのみ）", false)

  // 出力オプション
  .option("-t, --truncate", "出力先ディレクトリを空にしてから処理", false)

  // パフォーマンスオプション
  .option(
    "-c, --concurrency <number>",
    `並列処理数（デフォルト: ${DEFAULT_CONCURRENCY}）`,
    (value: string) => parseInt(value, 10)
  )

  // キャッシュオプション
  .option("--cache", "キャッシュを有効化（変更のないファイルをスキップ）", false)
  .option("--cache-dir <dir>", `キャッシュディレクトリ（デフォルト: ${DEFAULT_CACHE_DIR}）`)
  .option("--force", "キャッシュを無視して再処理", false)

  // 設定オプション
  .option("--config <path>", "設定ファイルのパス")

  // エラー処理オプション
  .option("--fail-fast", "エラー発生時に即座に終了", false)

  // 出力オプション
  .option("--no-color", "カラー出力を無効化")
  .option("--dry-run", "実際に変換せず、対象ファイルを表示", false)

  .parse();

// オプションを取得して実行
const options = program.opts() as ProcessImagesOptions;

try {
  await processImages(options);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Error:", message);
  process.exit(1);
}
