/**
 * カラーログ・統計サマリー
 */

// ANSI カラーコード
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m"
} as const;

type ColorName = keyof typeof COLORS;

export interface LoggerOptions {
  color?: boolean;
}

export interface ProgressDetails {
  originalSize?: number;
  outputSize?: number;
  duration?: number;
}

interface ErrorEntry {
  filePath: string;
  error: string;
}

interface Stats {
  total: number;
  optimized: number;
  encodedWebp: number;
  encodedAvif: number;
  copied: number;
  skipped: number;
  failed: number;
  originalSize: number;
  outputSize: number;
}

export type StatType = "optimized" | "webp" | "avif" | "copied" | "skipped";

/**
 * ロガークラス
 */
export class Logger {
  private useColor: boolean;
  public stats: Stats;
  public errors: ErrorEntry[];
  private startTime: number;

  constructor(options: LoggerOptions = {}) {
    this.useColor = options.color !== false && process.stdout.isTTY === true;
    this.stats = {
      total: 0,
      optimized: 0,
      encodedWebp: 0,
      encodedAvif: 0,
      copied: 0,
      skipped: 0,
      failed: 0,
      originalSize: 0,
      outputSize: 0
    };
    this.errors = [];
    this.startTime = Date.now();
  }

  /**
   * カラー適用
   */
  private color(text: string, colorName: ColorName): string {
    if (!this.useColor) return text;
    return `${COLORS[colorName] || ""}${text}${COLORS.reset}`;
  }

  /**
   * ファイルサイズをフォーマット
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * 時間をフォーマット
   */
  private formatTime(ms: number): string {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  }

  /**
   * 進捗ログ出力
   */
  progress(current: number, total: number, filePath: string, action: string, details: ProgressDetails = {}): void {
    const { originalSize, outputSize, duration } = details;

    const progress = this.color(`[${String(current).padStart(3)} / ${total}]`, "dim");
    const fileName = this.color(filePath, "cyan");

    let actionText: string;
    let actionColor: ColorName;

    if (action === "copied") {
      actionText = "copied";
      actionColor = "gray";
    } else if (action === "skipped") {
      actionText = "skipped (cached)";
      actionColor = "yellow";
    } else if (action === "failed") {
      actionText = "FAILED";
      actionColor = "red";
    } else {
      actionText = action;
      actionColor = "green";
    }

    let message = `${progress} ${fileName} ${this.color(actionText, actionColor)}`;

    if (originalSize && outputSize && action !== "skipped" && action !== "failed") {
      const reduction = ((1 - outputSize / originalSize) * 100).toFixed(0);
      const sizeInfo = `${this.formatSize(originalSize)} → ${this.formatSize(outputSize)}`;
      const reductionText = Number(reduction) > 0
        ? this.color(`(${reduction}% saved)`, "green")
        : this.color(`(+${Math.abs(Number(reduction))}%)`, "yellow");
      message += ` ${this.color(sizeInfo, "dim")} ${reductionText}`;
    }

    if (duration) {
      message += ` ${this.color(`(${duration} ms)`, "dim")}`;
    }

    console.log(message);
  }

  /**
   * GIF コピー時の特別メッセージ
   */
  gifCopied(current: number, total: number, filePath: string, duration: number): void {
    const progress = this.color(`[${String(current).padStart(3)} / ${total}]`, "dim");
    const fileName = this.color(filePath, "cyan");
    const action = this.color("copied", "gray");
    const hint = this.color("(GIF: use --gif to encode)", "dim");
    const time = this.color(`(${duration} ms)`, "dim");

    console.log(`${progress} ${fileName} ${action} ${hint} ${time}`);
  }

  /**
   * dry-run モードのログ
   */
  dryRun(filePath: string, outputs: string[]): void {
    const fileName = this.color(filePath, "cyan");
    const arrow = this.color("→", "dim");
    const outputList = outputs.map(o => this.color(o, "green")).join(", ");

    console.log(`${this.color("[DRY]", "yellow")} ${fileName} ${arrow} ${outputList}`);
  }

  /**
   * エラーを記録
   */
  addError(filePath: string, error: Error | string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.errors.push({ filePath, error: errorMessage });
    this.stats.failed++;
  }

  /**
   * 統計を更新
   */
  updateStats(type: StatType | StatType[], originalSize = 0, outputSize = 0): void {
    this.stats.total++;
    this.stats.originalSize += originalSize;
    this.stats.outputSize += outputSize;

    const types = Array.isArray(type) ? type : [type];
    for (const statType of new Set(types)) {
      switch (statType) {
        case "optimized":
          this.stats.optimized++;
          break;
        case "webp":
          this.stats.encodedWebp++;
          break;
        case "avif":
          this.stats.encodedAvif++;
          break;
        case "copied":
          this.stats.copied++;
          break;
        case "skipped":
          this.stats.skipped++;
          break;
      }
    }
  }

  /**
   * 最終サマリーを出力
   */
  summary(): void {
    const elapsed = Date.now() - this.startTime;
    const { total, optimized, encodedWebp, encodedAvif, copied, skipped, failed, originalSize, outputSize } = this.stats;

    const line = this.color("========================================", "dim");

    console.log("");
    console.log(line);
    console.log(this.color("  Summary", "bold"));
    console.log(line);
    console.log(`  Processed:  ${this.color(String(total), "cyan")} files`);

    if (optimized > 0) {
      console.log(`    Optimized:  ${this.color(String(optimized), "green")}`);
    }
    if (encodedWebp > 0 || encodedAvif > 0) {
      const parts: string[] = [];
      if (encodedWebp > 0) parts.push(`webp: ${encodedWebp}`);
      if (encodedAvif > 0) parts.push(`avif: ${encodedAvif}`);
      console.log(`    Encoded:    ${this.color(parts.join(", "), "green")}`);
    }
    if (copied > 0) {
      console.log(`    Copied:     ${this.color(String(copied), "gray")}`);
    }
    if (skipped > 0) {
      console.log(`    Skipped:    ${this.color(String(skipped), "yellow")} (cached)`);
    }
    if (failed > 0) {
      console.log(`    Failed:     ${this.color(String(failed), "red")}`);
    }

    if (originalSize > 0 && outputSize > 0) {
      const saved = originalSize - outputSize;
      const percent = ((saved / originalSize) * 100).toFixed(1);
      console.log("");
      console.log(`  Size:       ${this.formatSize(originalSize)} → ${this.formatSize(outputSize)}`);
      if (saved > 0) {
        console.log(`              ${this.color(`${this.formatSize(saved)} saved (${percent}%)`, "green")}`);
      }
    }

    console.log("");
    console.log(`  Time:       ${this.color(this.formatTime(elapsed), "cyan")}`);
    console.log(line);

    if (this.errors.length > 0) {
      console.log("");
      console.log(this.color("  Errors:", "red"));
      for (const { filePath, error } of this.errors) {
        console.log(`    ${this.color(filePath, "cyan")}: ${error}`);
      }
      console.log("");
    }
  }

  /**
   * 開始メッセージ
   */
  start(inputDir: string, outputDir: string, fileCount: number): void {
    console.log("");
    console.log(this.color("sharp-image-optimizer", "bold"));
    console.log(this.color(`  Input:  ${inputDir}`, "dim"));
    console.log(this.color(`  Output: ${outputDir}`, "dim"));
    console.log(this.color(`  Files:  ${fileCount}`, "dim"));
    console.log("");
  }
}

export default Logger;
