/**
 * パス解決とファイル出力パス生成のユーティリティ
 */
import path from "node:path";
import type { ProcessOptions } from "../cache.js";

export class PathResolver {
  /**
   * 出力ファイルパスを生成
   */
  static getOutputPath(
    inputPath: string,
    outputDir: string,
    extension?: string
  ): string {
    if (extension) {
      const basePath = inputPath.slice(0, inputPath.lastIndexOf('.'));
      return path.join(outputDir, `${basePath}.${extension}`);
    }
    return path.join(outputDir, inputPath);
  }

  /**
   * WebP形式の出力パスを生成
   */
  static getWebpPath(
    inputPath: string,
    outputDir: string,
    addSuffix: boolean
  ): string {
    if (addSuffix) {
      return path.join(outputDir, `${inputPath}.webp`);
    }
    const basePath = inputPath.slice(0, inputPath.lastIndexOf('.'));
    return path.join(outputDir, `${basePath}.webp`);
  }

  /**
   * AVIF形式の出力パスを生成
   */
  static getAvifPath(
    inputPath: string,
    outputDir: string,
    addSuffix: boolean
  ): string {
    if (addSuffix) {
      return path.join(outputDir, `${inputPath}.avif`);
    }
    const basePath = inputPath.slice(0, inputPath.lastIndexOf('.'));
    return path.join(outputDir, `${basePath}.avif`);
  }

  /**
   * SVGZ形式の出力パスを生成
   */
  static getSvgzPath(inputPath: string, outputDir: string): string {
    return path.join(outputDir, `${inputPath}z`);
  }

  /**
   * 相対パスへの正規化
   */
  static normalizeToRelative(filePath: string, baseDir: string): string {
    const relativePath = path.relative(baseDir, filePath);
    return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
  }

  /**
   * 期待される出力パスのリストを生成
   */
  static getExpectedOutputPaths(
    inputPath: string,
    outputDir: string,
    fileExtension: string,
    options: ProcessOptions
  ): string[] {
    const outputs: string[] = [];
    const isSvg = fileExtension === "svg";
    const isGif = fileExtension === "gif";

    if (isGif && !options.gif) {
      outputs.push(this.getOutputPath(inputPath, outputDir));
      return outputs;
    }

    if (isSvg) {
      // SVG処理
      if (options.svg && !(options.svgz && options.nosvg)) {
        outputs.push(this.getOutputPath(inputPath, outputDir));
      }
      if (options.svgz) {
        outputs.push(this.getSvgzPath(inputPath, outputDir));
      }
      if (outputs.length === 0) {
        outputs.push(this.getOutputPath(inputPath, outputDir));
      }
    } else {
      // ラスター画像処理
      if (options.minify) {
        outputs.push(this.getOutputPath(inputPath, outputDir));
      }
      if (options.webp) {
        outputs.push(this.getWebpPath(inputPath, outputDir, options.webpSuffixAdd || false));
      }
      if (options.avif) {
        outputs.push(this.getAvifPath(inputPath, outputDir, options.avifSuffixAdd || false));
      }
      if (outputs.length === 0) {
        outputs.push(this.getOutputPath(inputPath, outputDir));
      }
    }

    return outputs;
  }

  /**
   * 出力パスを相対パス形式に変換
   */
  static toRelativeOutputPaths(
    absolutePaths: string[],
    outputDir: string
  ): string[] {
    return absolutePaths.map(absolutePath => {
      const relativePath = path.relative(outputDir, absolutePath);
      return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
    });
  }
}