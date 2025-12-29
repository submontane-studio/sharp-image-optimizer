/**
 * sharp-image-optimizer メインロジック（リファクタ版）
 */

import path from "node:path";
import fse from "fs-extra";
import pLimit from "p-limit";

import { Logger, type StatType } from "./logger.js";
import { CacheManager, type ProcessOptions } from "./cache.js";
import { loadConfig, type Config } from "./config.js";
import { FileScanner } from "./utils/FileScanner.js";
import { PlanBuilder } from "./planning/PlanBuilder.js";
import { ProcessorManager } from "./processors/ProcessorManager.js";
import { SecurityValidator } from "./utils/SecurityValidator.js";
import type { PlanContext } from "./planning/types.js";

export interface ProcessImagesOptions {
  input: string;
  out: string;
  minify?: boolean;
  webp?: boolean;
  webpSuffixAdd?: boolean;
  avif?: boolean;
  avifSuffixAdd?: boolean;
  svg?: boolean;
  svgz?: boolean;
  nosvg?: boolean;
  gif?: boolean;
  truncate?: boolean;
  cache?: boolean;
  cacheDir?: string;
  force?: boolean;
  concurrency?: number;
  config?: string;
  failFast?: boolean;
  dryRun?: boolean;
  color?: boolean;
}

interface ProcessFileParams {
  imagePath: string;
  inputDir: string;
  outputDir: string;
  options: ProcessOptions;
  config: Config;
  cacheManager: CacheManager;
  logger: Logger;
  current: number;
  total: number;
  dryRun: boolean;
  processorManager: ProcessorManager;
}

/**
 * 画像変換を実行
 */
export async function processImages(options: ProcessImagesOptions): Promise<void> {
  const {
    input: inputDir,
    out: outputDir,
    minify = false,
    webp = false,
    webpSuffixAdd = false,
    avif = false,
    avifSuffixAdd = false,
    svg = false,
    svgz = false,
    nosvg = false,
    gif = false,
    truncate = false,
    cache = false,
    cacheDir: customCacheDir,
    force = false,
    concurrency: customConcurrency,
    config: customConfigPath,
    failFast = false,
    dryRun = false,
    color = true
  } = options;

  const config = await loadConfig(process.cwd(), customConfigPath);
  const logger = new Logger({ color });

  // セキュリティ検証
  const inputValidation = await SecurityValidator.validateInputDirectory(inputDir);
  if (!inputValidation.valid) {
    throw new Error(`入力ディレクトリエラー: ${inputValidation.error}`);
  }

  const outputValidation = await SecurityValidator.validateOutputDirectory(outputDir);
  if (!outputValidation.valid) {
    throw new Error(`出力ディレクトリエラー: ${outputValidation.error}`);
  }

  const cacheDir = customCacheDir || config.cacheDir;
  const cacheManager = new CacheManager(
    path.resolve(cacheDir),
    cache && !force
  );
  await cacheManager.load();

  const concurrency = customConcurrency || config.concurrency;
  const limit = pLimit(concurrency);

  // ファイル探索
  const imageFileList = FileScanner.scanImageFiles(inputDir);
  
  if (imageFileList.length === 0) {
    console.log("No files found in input directory.");
    return;
  }

  logger.start(inputDir, outputDir, imageFileList.length);

  if (truncate && !dryRun) {
    await fse.emptyDir(outputDir);
  }

  const totalFiles = imageFileList.length;
  let processedCount = 0;

  const processOptions: ProcessOptions = {
    minify,
    webp,
    webpSuffixAdd,
    avif,
    avifSuffixAdd,
    svg,
    svgz,
    nosvg,
    gif
  };

  // プロセッサマネージャーの初期化
  const processorManager = new ProcessorManager();

  const tasks = imageFileList.map(imagePath =>
    limit(async () => {
      processedCount++;
      const current = processedCount;

      try {
        await processFileRefactored({
          imagePath,
          inputDir,
          outputDir,
          options: processOptions,
          config,
          cacheManager,
          logger,
          current,
          total: totalFiles,
          dryRun,
          processorManager
        });
      } catch (error) {
        logger.addError(imagePath, error as Error);
        logger.progress(current, totalFiles, imagePath, "failed", {});

        if (failFast) {
          throw error;
        }
      }
    })
  );

  try {
    await Promise.all(tasks);
  } catch (error) {
    if (failFast) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("\nFailed fast due to error:", message);
    }
  }

  await cacheManager.save();
  logger.summary();

  if (logger.stats.failed > 0) {
    process.exitCode = 1;
  }
}

/**
 * 個別ファイルの処理（リファクタ版）
 */
async function processFileRefactored({
  imagePath,
  inputDir,
  outputDir,
  options,
  config,
  cacheManager,
  logger,
  current,
  total,
  dryRun,
  processorManager
}: ProcessFileParams): Promise<void> {
  const startTime = Date.now();
  const sourcePath = path.join(inputDir, imagePath);

  const stat = await fse.stat(sourcePath);
  const mtime = stat.mtimeMs;

  // キャッシュチェック
  if (await cacheManager.isValid(imagePath, mtime, options)) {
    const duration = Date.now() - startTime;
    logger.progress(current, total, imagePath, "skipped", { duration });
    logger.updateStats("skipped");
    return;
  }

  // 処理計画の構築
  const planContext: PlanContext = {
    inputPath: imagePath,
    inputDir,
    outputDir,
    options,
    config
  };
  const plan = PlanBuilder.buildPlan(planContext);

  // dry-run処理
  if (dryRun) {
    const outputs = PlanBuilder.getExpectedOutputs(plan);
    logger.dryRun(imagePath, outputs);
    return;
  }

  // 適切なプロセッサを取得して実行
  const processor = processorManager.getProcessor(plan);
  const processContext = {
    plan,
    sourcePath,
    inputDir,
    outputDir,
    options,
    config,
    mtime,
    fileSize: stat.size
  };

  const result = await processor.process(processContext);

  // 結果をログに出力
  const duration = Date.now() - startTime;
  const action = result.actions.join(" and ") || "processed";
  
  if (result.success) {
    logger.progress(current, total, imagePath, action, {
      originalSize: result.originalSize,
      outputSize: result.outputSize,
      duration
    });

    // 統計更新（複数アクション対応）
    const statTypes: StatType[] = [];
    const hasOptimize = plan.actions.some(planAction =>
      planAction.type === "optimize" || planAction.type === "compress"
    );

    if (hasOptimize) statTypes.push("optimized");
    if (plan.actions.some(planAction => planAction.type === "convert" && planAction.format === "webp")) {
      statTypes.push("webp");
    }
    if (plan.actions.some(planAction => planAction.type === "convert" && planAction.format === "avif")) {
      statTypes.push("avif");
    }
    if (plan.actions.some(planAction => planAction.type === "copy")) {
      statTypes.push("copied");
    }
    if (statTypes.length === 0) {
      statTypes.push("copied");
    }

    logger.updateStats(statTypes, result.originalSize, result.outputSize);

    // キャッシュ更新
    cacheManager.set(imagePath, mtime, options, result.outputs);
  } else {
    throw new Error(result.error || "処理に失敗しました");
  }
}

// 旧getExpectedOutputs関数は PlanBuilder.getExpectedOutputs に移動済み

export default { processImages };
