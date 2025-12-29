/**
 * キャッシュ管理モジュール
 */

import fse from "fs-extra";
import path from "node:path";
import crypto from "node:crypto";

const CACHE_FILE = "cache.json";

export interface ProcessOptions {
  minify?: boolean;
  webp?: boolean;
  webpSuffixAdd?: boolean;
  avif?: boolean;
  avifSuffixAdd?: boolean;
  svg?: boolean;
  svgz?: boolean;
  nosvg?: boolean;
  gif?: boolean;
}

interface CacheEntry {
  mtime: number;
  optionsHash: string;
  outputs: string[];
  updatedAt: number;
}

type CacheData = Record<string, CacheEntry>;

/**
 * キャッシュマネージャークラス
 */
export class CacheManager {
  private cacheDir: string;
  private enabled: boolean;
  private cachePath: string;
  private cache: CacheData;
  private dirty: boolean;

  constructor(cacheDir: string, enabled = false) {
    this.cacheDir = cacheDir;
    this.enabled = enabled;
    this.cachePath = path.join(cacheDir, CACHE_FILE);
    this.cache = {};
    this.dirty = false;
  }

  /**
   * キャッシュを読み込み
   */
  async load(): Promise<void> {
    if (!this.enabled) return;

    try {
      if (await fse.pathExists(this.cachePath)) {
        this.cache = await fse.readJson(this.cachePath) as CacheData;
      }
    } catch {
      this.cache = {};
    }
  }

  /**
   * キャッシュを保存
   */
  async save(): Promise<void> {
    if (!this.enabled || !this.dirty) return;

    try {
      await fse.ensureDir(this.cacheDir);
      await fse.writeJson(this.cachePath, this.cache, { spaces: 2 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to save cache:", message);
    }
  }

  /**
   * オプションからハッシュを生成
   */
  private generateOptionsHash(options: ProcessOptions): string {
    const relevantOptions = {
      minify: options.minify,
      webp: options.webp,
      webpSuffixAdd: options.webpSuffixAdd,
      avif: options.avif,
      avifSuffixAdd: options.avifSuffixAdd,
      svg: options.svg,
      svgz: options.svgz,
      nosvg: options.nosvg,
      gif: options.gif
    };

    const str = JSON.stringify(relevantOptions);
    return crypto.createHash("md5").update(str).digest("hex").slice(0, 8);
  }

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(filePath: string): string {
    return filePath.replace(/\\/g, "/");
  }

  /**
   * キャッシュが有効かチェック
   */
  async isValid(filePath: string, mtime: number, options: ProcessOptions): Promise<boolean> {
    if (!this.enabled) return false;

    const key = this.getCacheKey(filePath);
    const entry = this.cache[key];

    if (!entry) return false;

    const optionsHash = this.generateOptionsHash(options);

    return entry.mtime === mtime && entry.optionsHash === optionsHash;
  }

  /**
   * キャッシュエントリを更新
   */
  set(filePath: string, mtime: number, options: ProcessOptions, outputs: string[]): void {
    if (!this.enabled) return;

    const key = this.getCacheKey(filePath);
    const optionsHash = this.generateOptionsHash(options);

    this.cache[key] = {
      mtime,
      optionsHash,
      outputs,
      updatedAt: Date.now()
    };

    this.dirty = true;
  }

  /**
   * キャッシュエントリを取得
   */
  get(filePath: string): CacheEntry | null {
    const key = this.getCacheKey(filePath);
    return this.cache[key] || null;
  }

  /**
   * キャッシュをクリア
   */
  async clear(): Promise<void> {
    this.cache = {};
    this.dirty = true;

    if (await fse.pathExists(this.cachePath)) {
      await fse.remove(this.cachePath);
    }
  }

  /**
   * 古いエントリを削除
   */
  prune(maxAge = 30 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of Object.entries(this.cache)) {
      if (entry.updatedAt && now - entry.updatedAt > maxAge) {
        delete this.cache[key];
        pruned++;
      }
    }

    if (pruned > 0) {
      this.dirty = true;
    }

    return pruned;
  }
}

export default CacheManager;
