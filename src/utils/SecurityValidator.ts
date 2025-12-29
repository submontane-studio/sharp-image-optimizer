/**
 * セキュリティ検証ユーティリティ
 */
import path from "node:path";
import fse from "fs-extra";

export class SecurityValidator {
  /**
   * パストラバーサル攻撃を防ぐパス検証
   */
  static validatePath(inputPath: string, baseDir: string): boolean {
    try {
      // パスを正規化
      const normalizedInput = path.resolve(inputPath);
      const normalizedBase = path.resolve(baseDir);

      // 入力パスがベースディレクトリ内にあるかチェック
      const relative = path.relative(normalizedBase, normalizedInput);
      
      // 相対パスが../ で始まる場合は基底ディレクトリを抜けようとしている
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    } catch {
      return false;
    }
  }

  /**
   * 安全な出力パス生成
   */
  static securePath(inputPath: string, outputDir: string): string {
    // ファイル名部分のみを取得（ディレクトリトラバーサル要素を除去）
    const basename = path.basename(inputPath);
    
    // 危険な文字をサニタイズ
    const safeName = basename.replace(/[<>:"|?*\x00-\x1f]/g, '_');
    
    return path.join(outputDir, safeName);
  }

  /**
   * ファイル拡張子の検証
   */
  static validateFileExtension(filePath: string, allowedExtensions: string[]): boolean {
    const ext = path.extname(filePath).substring(1).toLowerCase();
    return allowedExtensions.includes(ext);
  }

  /**
   * ファイルサイズ制限チェック
   */
  static async validateFileSize(filePath: string, maxSizeBytes: number): Promise<boolean> {
    try {
      const stat = await fse.stat(filePath);
      return stat.size <= maxSizeBytes;
    } catch {
      return false;
    }
  }

  /**
   * 入力ディレクトリの検証
   */
  static async validateInputDirectory(dirPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // パス正規化
      const normalizedPath = path.resolve(dirPath);
      
      // ディレクトリの存在確認
      const stat = await fse.stat(normalizedPath);
      if (!stat.isDirectory()) {
        return { valid: false, error: "指定されたパスはディレクトリではありません" };
      }

      // 読み取り権限チェック
      await fse.access(normalizedPath, fse.constants.R_OK);
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `ディレクトリアクセスエラー: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * 出力ディレクトリの検証と作成
   */
  static async validateOutputDirectory(dirPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // パス正規化
      const normalizedPath = path.resolve(dirPath);
      
      // 書き込み権限チェック
      await fse.ensureDir(normalizedPath);
      await fse.access(normalizedPath, fse.constants.W_OK);
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `出力ディレクトリエラー: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}