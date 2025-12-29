/**
 * 設定ファイル読み込みモジュール
 */

import fse from "fs-extra";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig as loadSvgoConfig } from "svgo";
import {
  ENCODER_OPTIONS,
  SVGO_DEFAULT_CONFIG,
  DEFAULT_CONCURRENCY,
  DEFAULT_CACHE_DIR,
  type EncoderOptions,
  type SvgoConfig
} from "./defaults.js";

// 設定ファイル名の候補
const CONFIG_FILE_NAMES = [
  "sharp-image-optimizer.config.mjs",
  "sharp-image-optimizer.config.js",
  "sharp-image-optimizer.config.json",
  "sio.config.mjs",
  "sio.config.js",
  "sio.config.json"
];

export interface UserConfig {
  encoderOptions?: Partial<EncoderOptions>;
  svgo?: SvgoConfig;
  concurrency?: number;
  cacheDir?: string;
}

export interface Config {
  encoderOptions: EncoderOptions;
  svgo: SvgoConfig;
  concurrency: number;
  cacheDir: string;
  _configPath: string | null;
}

/**
 * 設定ファイルを検索
 */
async function findConfigFile(cwd: string, customPath?: string): Promise<string | null> {
  if (customPath) {
    const fullPath = path.isAbsolute(customPath)
      ? customPath
      : path.join(cwd, customPath);

    if (await fse.pathExists(fullPath)) {
      return fullPath;
    }
    throw new Error(`Config file not found: ${customPath}`);
  }

  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.join(cwd, fileName);
    if (await fse.pathExists(filePath)) {
      return filePath;
    }
  }

  return null;
}

/**
 * 設定ファイルを読み込み
 */
async function loadConfigFile(configPath: string | null): Promise<UserConfig> {
  if (!configPath) return {};

  const ext = path.extname(configPath).toLowerCase();

  if (ext === ".json") {
    return await fse.readJson(configPath) as UserConfig;
  }

  const fileUrl = pathToFileURL(configPath).href;
  const module = await import(fileUrl) as { default?: UserConfig } | UserConfig;
  return ("default" in module && module.default) ? module.default : module as UserConfig;
}

/**
 * オブジェクトを深くマージ
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result[key] = deepMerge(targetValue, sourceValue as any) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * 設定を読み込んでマージ
 */
export async function loadConfig(cwd: string, customConfigPath?: string): Promise<Config> {
  const configPath = await findConfigFile(cwd, customConfigPath);
  const userConfig = await loadConfigFile(configPath);

  let svgoConfig: SvgoConfig | null = null;
  try {
    const loaded = await loadSvgoConfig(cwd);
    if (loaded) {
      svgoConfig = loaded as unknown as SvgoConfig;
    }
  } catch {
    svgoConfig = null;
  }

  const config: Config = {
    encoderOptions: deepMerge(ENCODER_OPTIONS, userConfig.encoderOptions || {}),
    svgo: svgoConfig || userConfig.svgo || SVGO_DEFAULT_CONFIG,
    concurrency: userConfig.concurrency || DEFAULT_CONCURRENCY,
    cacheDir: userConfig.cacheDir || DEFAULT_CACHE_DIR,
    _configPath: configPath
  };

  return config;
}

export default { loadConfig };
