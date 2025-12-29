/**
 * デフォルト設定
 */

import type { PngOptions, JpegOptions, WebpOptions, AvifOptions, GifOptions } from "sharp";

// エンコーダーマッピング型
export type EncoderType = "jpeg" | "png" | "gif";

// 変換対象拡張子とエンコーダーのマッピング
export const ENCODER_MAP: Record<string, EncoderType> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  gif: "gif"
};

// 各フォーマット別のエンコードオプション
export interface EncoderOptions {
  png: PngOptions;
  jpeg: JpegOptions;
  gif: GifOptions;
  webp: {
    png: WebpOptions;
    jpeg: WebpOptions;
    gif: WebpOptions;
  };
  avif: {
    png: AvifOptions;
    jpeg: AvifOptions;
    gif: AvifOptions;
  };
}

export const ENCODER_OPTIONS: EncoderOptions = {
  png: {
    compressionLevel: 9,
    adaptiveFiltering: true,
    progressive: true
  },
  jpeg: {
    quality: 80,
    progressive: true
  },
  gif: {
    // GIF は基本的にそのまま
  },
  webp: {
    png: {
      lossless: true,
      quality: 100
    },
    jpeg: {
      quality: 90
    },
    gif: {
      quality: 90
    }
  },
  avif: {
    png: {
      lossless: true,
      quality: 100
    },
    jpeg: {
      quality: 80
    },
    gif: {
      quality: 80
    }
  }
};

// SVGO デフォルト設定
export interface SvgoConfig {
  multipass: boolean;
  plugins: Array<{
    name: string;
    params?: {
      overrides?: Record<string, boolean>;
    };
  }>;
}

export const SVGO_DEFAULT_CONFIG: SvgoConfig = {
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeViewBox: false,
          cleanupIds: false
        }
      }
    }
  ]
};

// デフォルトの並列処理数
export const DEFAULT_CONCURRENCY = 4;

// デフォルトのキャッシュディレクトリ
export const DEFAULT_CACHE_DIR = ".image-cache";
