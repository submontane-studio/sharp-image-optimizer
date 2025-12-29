# Publish手順

## GitHub Packagesへのpublish

```bash
# 1. ビルド
npm run build

# 2. 1Passwordからトークン取得してpublish
NPM_TOKEN=$(op item get "GitHub NPM Token" --field token) npm publish

# 3. 確認
# https://github.com/submontane-studio/sharp-image-optimizer/packages
```

## バージョン更新

```bash
# package.jsonのversionを更新してからpublish
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0  
npm version major  # 1.0.0 -> 2.0.0
```

## インストール方法

```bash
npm install @submontane-studio/sharp-image-optimizer --registry=https://npm.pkg.github.com
```