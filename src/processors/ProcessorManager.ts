/**
 * プロセッサの管理とルーティング
 */
import type { ImageProcessor } from "./BaseProcessor.js";
import { RasterProcessor } from "./RasterProcessor.js";
import { SvgProcessor } from "./SvgProcessor.js";
import { CopyProcessor } from "./CopyProcessor.js";
import type { ProcessPlan } from "../planning/types.js";

export class ProcessorManager {
  private processors: ImageProcessor[] = [];

  constructor() {
    // 利用可能なプロセッサを登録
    this.processors = [
      new RasterProcessor(),
      new SvgProcessor(),
      new CopyProcessor()
    ];
  }

  /**
   * 処理計画に適したプロセッサを取得
   */
  getProcessor(plan: ProcessPlan): ImageProcessor {
    const processor = this.processors.find(p => p.canProcess(plan));
    
    if (!processor) {
      throw new Error(`No suitable processor found for ${plan.processorType} type`);
    }

    return processor;
  }

  /**
   * 利用可能なプロセッサの一覧を取得
   */
  getAvailableProcessors(): string[] {
    return this.processors.map(p => p.getName());
  }
}