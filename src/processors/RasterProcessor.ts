/**
 * ラスター画像（JPEG, PNG, WebP, AVIF, GIF）の処理
 */
import sharp from "sharp";
import fse from "fs-extra";
import path from "node:path";
import { ENCODER_MAP, type EncoderType } from "../defaults.js";
import type { ImageProcessor, ProcessContext, ProcessResult } from "./BaseProcessor.js";
import type { ProcessPlan } from "../planning/types.js";

export class RasterProcessor implements ImageProcessor {
  getName(): string {
    return "RasterProcessor";
  }

  canProcess(plan: ProcessPlan): boolean {
    return plan.processorType === 'raster';
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
      const encoder = ENCODER_MAP[plan.fileExtension] as EncoderType | undefined;
      
      if (!encoder) {
        throw new Error(`Unsupported format: ${plan.fileExtension}`);
      }
      
      const sourceForEncoder = encoder === "jpeg" ? "jpeg" : encoder;

      // 各アクションを実行
      for (const action of plan.actions) {
        switch (action.type) {
          case 'optimize':
            await this.processOptimize(sourcePath, plan, config, result);
            break;
          case 'convert':
            if (action.format === 'webp') {
              await this.processWebp(sourcePath, plan, config, result, sourceForEncoder);
            } else if (action.format === 'avif') {
              await this.processAvif(sourcePath, plan, config, result, sourceForEncoder);
            }
            break;
          case 'copy':
            await this.processCopy(sourcePath, plan.outputs[0].absolutePath, result);
            break;
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
   * 画像最適化処理
   */
  private async processOptimize(
    sourcePath: string,
    plan: ProcessPlan,
    config: any,
    result: ProcessResult
  ): Promise<void> {
    const output = plan.outputs.find(o => o.action === 'optimized');
    if (!output) return;

    const encoder = plan.fileExtension === 'jpg' ? 'jpeg' : plan.fileExtension;
    const encoderOptions = config.encoderOptions[encoder] || {};

    await fse.ensureDir(path.dirname(output.absolutePath));
    
    await sharp(sourcePath)
      .toFormat(encoder as any, encoderOptions)
      .toFile(output.absolutePath);

    // 出力ファイルの権限を適切に設定
    await fse.chmod(output.absolutePath, 0o644);

    const stat = await fse.stat(output.absolutePath);
    result.outputSize += stat.size;
    result.actions.push('optimized');
    result.outputs.push(output.relativePath);
  }

  /**
   * WebP変換処理
   */
  private async processWebp(
    sourcePath: string,
    plan: ProcessPlan,
    config: any,
    result: ProcessResult,
    sourceForEncoder: string
  ): Promise<void> {
    const output = plan.outputs.find(o => o.format === 'webp');
    if (!output) return;

    const webpOptionsKey = sourceForEncoder as "png" | "jpeg" | "gif";
    const webpOptions = config.encoderOptions.webp?.[webpOptionsKey] ||
                        config.encoderOptions.webp?.jpeg ||
                        { quality: 90 };

    await fse.ensureDir(path.dirname(output.absolutePath));

    await sharp(sourcePath)
      .webp(webpOptions)
      .toFile(output.absolutePath);

    // ファイル権限設定
    await fse.chmod(output.absolutePath, 0o644);

    const stat = await fse.stat(output.absolutePath);
    result.outputSize += stat.size;
    result.actions.push('converted to webp');
    result.outputs.push(output.relativePath);
  }

  /**
   * AVIF変換処理
   */
  private async processAvif(
    sourcePath: string,
    plan: ProcessPlan,
    config: any,
    result: ProcessResult,
    sourceForEncoder: string
  ): Promise<void> {
    const output = plan.outputs.find(o => o.format === 'avif');
    if (!output) return;

    const avifOptionsKey = sourceForEncoder as "png" | "jpeg" | "gif";
    const avifOptions = config.encoderOptions.avif?.[avifOptionsKey] ||
                        { quality: 80 };

    await fse.ensureDir(path.dirname(output.absolutePath));

    await sharp(sourcePath)
      .avif(avifOptions)
      .toFile(output.absolutePath);

    // ファイル権限設定
    await fse.chmod(output.absolutePath, 0o644);

    const stat = await fse.stat(output.absolutePath);
    result.outputSize += stat.size;
    result.actions.push('converted to avif');
    result.outputs.push(output.relativePath);
  }

  /**
   * ファイルコピー処理
   */
  private async processCopy(
    sourcePath: string,
    outputPath: string,
    result: ProcessResult
  ): Promise<void> {
    await fse.ensureDir(path.dirname(outputPath));
    await fse.copy(sourcePath, outputPath);

    const stat = await fse.stat(outputPath);
    result.outputSize += stat.size;
    result.actions.push('copied');
    
    const relativePath = path.basename(outputPath);
    result.outputs.push(relativePath);
  }
}