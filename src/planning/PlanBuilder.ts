/**
 * 処理計画の生成
 */
import path from "node:path";
import { ENCODER_MAP } from "../defaults.js";
import { PathResolver } from "../utils/PathResolver.js";
import type { ProcessPlan, ProcessAction, OutputPlan, PlanContext, ProcessorType } from "./types.js";

export class PlanBuilder {
  /**
   * ファイル処理計画を構築
   */
  static buildPlan(context: PlanContext): ProcessPlan {
    const { inputPath, inputDir, outputDir, options, config } = context;
    const fileExtension = path.extname(inputPath).substring(1).toLowerCase();

    const plan: ProcessPlan = {
      inputPath,
      fileExtension,
      actions: [],
      outputs: [],
      needsProcessing: false,
      processorType: this.determineProcessorType(fileExtension, options)
    };

    // 処理タイプに応じて計画を構築
    switch (plan.processorType) {
      case 'svg':
        this.buildSvgPlan(plan, context);
        break;
      case 'raster':
        this.buildRasterPlan(plan, context);
        break;
      case 'copy':
        this.buildCopyPlan(plan, context);
        break;
    }

    return plan;
  }

  /**
   * 処理タイプの決定
   */
  private static determineProcessorType(fileExtension: string, options: any): ProcessorType {
    if (fileExtension === 'svg') {
      return 'svg';
    }

    const encoder = ENCODER_MAP[fileExtension];
    const hasEncodingTask = options.minify || options.webp || options.avif;
    
    if (encoder && hasEncodingTask) {
      return 'raster';
    }

    if (fileExtension === 'gif' && options.gif) {
      return 'raster';
    }

    return 'copy';
  }

  /**
   * SVG処理計画の構築
   */
  private static buildSvgPlan(plan: ProcessPlan, context: PlanContext): void {
    const { inputPath, inputDir, outputDir, options } = context;

    const hasOptimization = options.svg;
    const hasSvgzOutput = options.svgz;
    const noSvgOutput = options.svgz && options.nosvg;

    if (hasOptimization || hasSvgzOutput) {
      plan.needsProcessing = true;

      if (hasOptimization) {
        plan.actions.push({
          type: 'optimize',
          format: 'svg',
          description: 'SVG最適化'
        });
      }

      // 通常のSVG出力
      if (!noSvgOutput) {
        const outputPath = PathResolver.getOutputPath(inputPath, outputDir);
        plan.outputs.push({
          relativePath: inputPath,
          absolutePath: outputPath,
          format: 'svg',
          action: hasOptimization ? 'optimized' : 'copied'
        });
      }

      // SVGZ出力
      if (hasSvgzOutput) {
        const svgzPath = PathResolver.getSvgzPath(inputPath, outputDir);
        plan.actions.push({
          type: 'compress',
          format: 'svgz',
          description: 'SVGZ圧縮'
        });
        plan.outputs.push({
          relativePath: `${inputPath}z`,
          absolutePath: svgzPath,
          format: 'svgz',
          action: 'compressed to svgz'
        });
      }
    } else {
      // 処理なしのコピー
      plan.needsProcessing = true; // コピー処理は必要
      plan.actions.push({
        type: 'copy',
        description: 'ファイルコピー'
      });
      
      const outputPath = PathResolver.getOutputPath(inputPath, outputDir);
      plan.outputs.push({
        relativePath: inputPath,
        absolutePath: outputPath,
        format: 'svg',
        action: 'copied'
      });
    }
  }

  /**
   * ラスター画像処理計画の構築
   */
  private static buildRasterPlan(plan: ProcessPlan, context: PlanContext): void {
    const { inputPath, inputDir, outputDir, options } = context;

    plan.needsProcessing = true;

    // 最適化処理
    if (options.minify) {
      plan.actions.push({
        type: 'optimize',
        format: plan.fileExtension,
        encoder: plan.fileExtension === 'jpg' ? 'jpeg' : plan.fileExtension,
        description: '画像最適化'
      });

      const outputPath = PathResolver.getOutputPath(inputPath, outputDir);
      plan.outputs.push({
        relativePath: inputPath,
        absolutePath: outputPath,
        format: plan.fileExtension,
        action: 'optimized'
      });
    }

    // WebP変換
    if (options.webp) {
      plan.actions.push({
        type: 'convert',
        format: 'webp',
        encoder: 'webp',
        description: 'WebP変換'
      });

      const webpPath = PathResolver.getWebpPath(inputPath, outputDir, options.webpSuffixAdd || false);
      const webpRelativePath = PathResolver.toRelativeOutputPaths([webpPath], outputDir)[0];
      
      plan.outputs.push({
        relativePath: webpRelativePath,
        absolutePath: webpPath,
        format: 'webp',
        action: 'converted to webp'
      });
    }

    // AVIF変換
    if (options.avif) {
      plan.actions.push({
        type: 'convert',
        format: 'avif',
        encoder: 'avif',
        description: 'AVIF変換'
      });

      const avifPath = PathResolver.getAvifPath(inputPath, outputDir, options.avifSuffixAdd || false);
      const avifRelativePath = PathResolver.toRelativeOutputPaths([avifPath], outputDir)[0];
      
      plan.outputs.push({
        relativePath: avifRelativePath,
        absolutePath: avifPath,
        format: 'avif',
        action: 'converted to avif'
      });
    }

    // GIF処理
    if (plan.fileExtension === 'gif' && !options.gif) {
      // GIF処理無効時はコピーのみ
      plan.actions = [{
        type: 'copy',
        description: 'GIFファイルコピー'
      }];
      
      const outputPath = PathResolver.getOutputPath(inputPath, outputDir);
      plan.outputs = [{
        relativePath: inputPath,
        absolutePath: outputPath,
        format: 'gif',
        action: 'copied'
      }];
    }
  }

  /**
   * コピー処理計画の構築
   */
  private static buildCopyPlan(plan: ProcessPlan, context: PlanContext): void {
    const { inputPath, outputDir } = context;

    plan.needsProcessing = true;
    plan.skipReason = '変換対象外フォーマット';

    plan.actions.push({
      type: 'copy',
      description: 'ファイルコピー'
    });

    const outputPath = PathResolver.getOutputPath(inputPath, outputDir);
    plan.outputs.push({
      relativePath: inputPath,
      absolutePath: outputPath,
      format: plan.fileExtension,
      action: 'copied'
    });
  }

  /**
   * dry-run用の出力パスリスト生成
   */
  static getExpectedOutputs(plan: ProcessPlan): string[] {
    return plan.outputs.map(output => output.relativePath);
  }
}