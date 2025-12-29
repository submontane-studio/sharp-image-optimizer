/**
 * 変換対象外ファイルのコピー処理
 */
import fse from "fs-extra";
import path from "node:path";
import type { ImageProcessor, ProcessContext, ProcessResult } from "./BaseProcessor.js";
import type { ProcessPlan } from "../planning/types.js";

export class CopyProcessor implements ImageProcessor {
  getName(): string {
    return "CopyProcessor";
  }

  canProcess(plan: ProcessPlan): boolean {
    return plan.processorType === 'copy';
  }

  async process(context: ProcessContext): Promise<ProcessResult> {
    const { plan, sourcePath, fileSize } = context;
    const startTime = Date.now();

    const result: ProcessResult = {
      success: false,
      actions: [],
      outputs: [],
      originalSize: fileSize,
      outputSize: 0,
      duration: 0
    };

    try {
      // 通常は1つの出力のみ
      const output = plan.outputs[0];
      if (!output) {
        throw new Error("No output defined for copy operation");
      }

      await fse.ensureDir(path.dirname(output.absolutePath));
      await fse.copy(sourcePath, output.absolutePath);
      
      // ファイル権限設定
      await fse.chmod(output.absolutePath, 0o644);

      const stat = await fse.stat(output.absolutePath);
      result.outputSize = stat.size;
      result.actions.push('copied');
      result.outputs.push(output.relativePath);
      result.success = true;

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }
}