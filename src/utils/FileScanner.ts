/**
 * ファイル探索とフィルタリング機能
 */
import { globSync } from "glob";
import path from "node:path";
import { SecurityValidator } from "./SecurityValidator.js";

export interface ScanOptions {
  cwd: string;
  extensions?: string[];
  excludePatterns?: string[];
}

export class FileScanner {
  /**
   * 指定ディレクトリから画像ファイルを探索
   */
  static scanImageFiles(inputDir: string, options?: Partial<ScanOptions>): string[] {
    // 入力ディレクトリのセキュリティ検証
    const normalizedInputDir = path.resolve(inputDir);
    
    const opts: ScanOptions = {
      cwd: normalizedInputDir,
      extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'tiff'],
      excludePatterns: [],
      ...options
    };

    try {
      const files = globSync("**/*.*", { 
        cwd: opts.cwd, 
        nodir: true,
        ignore: opts.excludePatterns
      });

      return files
        .filter(file => this.isValidImageFile(file, opts.extensions || []))
        .filter(file => this.isSecureFile(file, opts.cwd))
        .filter(file => this.isValidFileName(file))
        .map(file => this.normalizeFilePath(file))
        .sort();
    } catch (error) {
      console.error(`ファイル探索エラー: ${error}`);
      return [];
    }
  }

  /**
   * ファイル拡張子のバリデーション
   */
  private static isValidImageFile(filePath: string, allowedExtensions: string[]): boolean {
    const ext = path.extname(filePath).substring(1).toLowerCase();
    return allowedExtensions.length === 0 || allowedExtensions.includes(ext);
  }

  /**
   * セキュアなファイルかチェック
   */
  private static isSecureFile(filePath: string, baseDir: string): boolean {
    // パストラバーサル攻撃の防止
    return SecurityValidator.validatePath(path.join(baseDir, filePath), baseDir);
  }

  /**
   * ファイル名の有効性をチェック
   */
  private static isValidFileName(filePath: string): boolean {
    const fileName = path.basename(filePath);
    
    // 空のファイル名や隠しファイル（.で始まる）を除外
    if (!fileName || fileName.startsWith('.')) {
      return false;
    }
    
    // 危険な文字をチェック
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      return false;
    }
    
    // 最大ファイル名長チェック（255文字制限）
    if (fileName.length > 255) {
      return false;
    }
    
    return true;
  }

  /**
   * ファイルパスの正規化
   */
  private static normalizeFilePath(filePath: string): string {
    // パスの区切り文字を統一し、相対パス形式に変換
    const normalized = filePath.replace(/\\/g, "/");
    return normalized.startsWith("./") ? normalized : `./${normalized}`;
  }

  /**
   * ファイル数の取得（高速カウント）
   */
  static countFiles(inputDir: string, options?: Partial<ScanOptions>): number {
    return this.scanImageFiles(inputDir, options).length;
  }

  /**
   * ファイルリストの検証
   */
  static validateFileList(files: string[], inputDir: string): string[] {
    return files.filter(file => {
      const fullPath = path.resolve(inputDir, file);
      try {
        return require("fs").existsSync(fullPath);
      } catch {
        return false;
      }
    });
  }
}