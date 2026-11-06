# HG-V1 見本用フォント

見本に使う文字だけを含むWOFF2サブセット。一般の作品入力用フォントではありません。文字集合を変更した場合は再生成してください。縦組に必要なOpenTypeレイアウト機能を保持しています。

- Noto Sans JP Regular / Bold：既存 `packages/vendor/fonts/noto-sans-jp/` のTTFから生成。著作権とSIL Open Font Licenseは `notosansjp-OFL.txt` に同梱。
- Noto Serif JP：Google Fontsの [8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5](https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/notoserifjp) の可変TTFを使用。フォント内の著作権表記は `(c) 2017-2024 Adobe (http://www.adobe.com/).`。配布元のSIL Open Font Licenseを `notoserifjp-OFL.txt` に同梱。

再生成：`python apps/reconstruction/scripts/build-legend-fonts.py /path/to/NotoSerifJP-source.ttf`。元ファイルと生成物のSHA-256は `manifest.json` に記録します。
