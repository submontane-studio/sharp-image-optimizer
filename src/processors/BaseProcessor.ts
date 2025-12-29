/**
 * 画像プロセッサの基底インターフェース
 */
import type { ProcessPlan } from "../planning/types.js";
import type { ProcessOptions } from "../cache.js";
import type { Config } from "../config.js";
import type { Logger } from "../logger.js";
import type { CacheManager } from "../cache.js";

export interface ProcessContext {
  /** 処理計画 */
  plan: ProcessPlan;
  /** ソースファイルの絶対パス */
  sourcePath: string;
  /** 入力ディレクトリ */
  inputDir: string;
  /** 出力ディレクトリ */
  outputDir: string;
  /** 処理オプション */
  options: ProcessOptions;
  /** 設定 */
  config: Config;
  /** ファイルのmtime */
  mtime: number;
  /** ファイルサイズ */
  fileSize: number;
}

export interface ProcessResult {
  /** 成功したかどうか */
  success: boolean;
  /** 実行されたアクション */
  actions: string[];
  /** 出力ファイルパス（相対） */
  outputs: string[];
  /** 元ファイルサイズ */
  originalSize: number;
  /** 出力ファイル合計サイズ */
  outputSize: number;
  /** 処理時間（ミリ秒） */
  duration: number;
  /** エラーメッセージ（失敗時） */
  error?: string;
}

export interface ImageProcessor {
  /**
   * このプロセッサが対象ファイルを処理できるか判定
   */
  canProcess(plan: ProcessPlan): boolean;

  /**
   * 画像処理を実行
   */
  process(context: ProcessContext): Promise<ProcessResult>;

  /**
   * プロセッサの名前
   */
  getName(): string;
}