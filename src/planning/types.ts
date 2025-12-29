/**
 * 処理計画に関する型定義
 */
import type { ProcessOptions } from "../cache.js";
import type { Config } from "../config.js";

export interface ProcessPlan {
  /** 入力ファイルパス */
  inputPath: string;
  /** ファイル拡張子 */
  fileExtension: string;
  /** 実行される処理アクション */
  actions: ProcessAction[];
  /** 期待される出力ファイル */
  outputs: OutputPlan[];
  /** 処理が必要かどうか */
  needsProcessing: boolean;
  /** スキップ理由（処理不要の場合） */
  skipReason?: string;
  /** 処理タイプ */
  processorType: ProcessorType;
}

export interface ProcessAction {
  /** アクションタイプ */
  type: 'optimize' | 'convert' | 'compress' | 'copy';
  /** 出力フォーマット */
  format?: string;
  /** 使用するエンコーダ */
  encoder?: string;
  /** アクションの説明 */
  description: string;
}

export interface OutputPlan {
  /** 出力ファイルパス（相対） */
  relativePath: string;
  /** 出力ファイルパス（絶対） */
  absolutePath: string;
  /** 出力フォーマット */
  format: string;
  /** 実行されるアクション */
  action: string;
}

export type ProcessorType = 'raster' | 'svg' | 'copy';

export interface PlanContext {
  inputPath: string;
  inputDir: string;
  outputDir: string;
  options: ProcessOptions;
  config: Config;
}