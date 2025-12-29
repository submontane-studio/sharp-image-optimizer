/**
 * SVG/SVGZ画像の処理
 */
import fse from "fs-extra";
import path from "node:path";
import { promisify } from "node:util";
import zlib from "node:zlib";
import { optimize as svgoOptimize } from "svgo";
import type { ImageProcessor, ProcessContext, ProcessResult } from "./BaseProcessor.js";
import type { ProcessPlan } from "../planning/types.js";

const gzip = promisify(zlib.gzip);

export class SvgProcessor implements ImageProcessor {
  getName(): string {
    return "SvgProcessor";
  }

  canProcess(plan: ProcessPlan): boolean {
    return plan.processorType === 'svg';
  }

  async process(context: ProcessContext): Promise<ProcessResult> {
    const { plan, sourcePath, config, fileSize } = context;
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
      let svgData = await fse.readFile(sourcePath, "utf-8");

      // SVG最適化
      const optimizeAction = plan.actions.find(a => a.type === 'optimize');
      if (optimizeAction) {
        const svgoResult = svgoOptimize(svgData, config.svgo as any);
        svgData = svgoResult.data;
        result.actions.push('optimized');
      }

      // 各出力ファイルを生成
      for (const output of plan.outputs) {
        if (output.format === 'svg') {
          await this.processSvgOutput(svgData, output.absolutePath, result, output.relativePath);
          if (!optimizeAction && !result.actions.includes('copied')) {
            result.actions.push('copied');
          }
        } else if (output.format === 'svgz') {
          await this.processSvgzOutput(svgData, output.absolutePath, result, output.relativePath);
        }
      }

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * 通常のSVG出力処理
   */
  private async processSvgOutput(
    svgData: string,
    outputPath: string,
    result: ProcessResult,
    relativePath: string
  ): Promise<void> {
    await fse.ensureDir(path.dirname(outputPath));
    await fse.outputFile(outputPath, svgData);
    
    // ファイル権限設定
    await fse.chmod(outputPath, 0o644);

    const stat = await fse.stat(outputPath);
    result.outputSize += stat.size;
    result.outputs.push(relativePath);
  }

  /**
   * SVGZ（gzip圧縮）出力処理
   */
  private async processSvgzOutput(
    svgData: string,
    outputPath: string,
    result: ProcessResult,
    relativePath: string
  ): Promise<void> {
    const svgzData = await gzip(Buffer.from(svgData));
    
    await fse.ensureDir(path.dirname(outputPath));
    await fse.outputFile(outputPath, svgzData);
    
    // ファイル権限設定
    await fse.chmod(outputPath, 0o644);

    const stat = await fse.stat(outputPath);
    result.outputSize += stat.size;
    result.outputs.push(relativePath);
    
    if (!result.actions.includes('compressed to svgz')) {
      result.actions.push('compressed to svgz');
    }
  }
}
