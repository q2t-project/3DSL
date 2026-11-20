# 3DSS 仕様書 v2.0.0

3DSS（Three-Dimensional Structural Schema）は、3DSLの図をJSONで交換する形式です。ファイルの拡張子は `.3dss.json` です。

| 項目 | 値 |
|---|---|
| JSON Schemaの方言 | Draft 2020-12 |
| スキーマ識別子 `$id` | `https://3dsl.jp/schemas/release/v2.0.0/3DSS.schema.json` |
| スキーマアンカー `$anchor` | `v2.0.0` |
| 文書の `document_meta.schema_uri` | `https://3dsl.jp/schemas/release/v2.0.0/3DSS.schema.json#v2.0.0` |

[固定版のJSON Schema](/schemas/release/v2.0.0/3DSS.schema.json) · [固定版の仕様書](/schemas/release/v2.0.0/3DSS_spec.md) · [旧版 v1.1.4](/docs/spec/v1.1.4/) · [図の制作ガイド](/docs/usage/author-3dss/)

## 1. 文書構造

| ルートの項目 | スキーマ上の条件 | 役割 |
|---|---|---|
| `document_meta` | 必須 | タイトル、文書UUID、対応形式と版、作者、日時。 |
| `points` | 任意の配列 | 概念や観測位置などの点。 |
| `lines` | 任意の配列 | 関係の意味、両端、経路、矢印、キャプション。 |
| `surfaces` | 任意の配列 | 名前とUUIDを持ち、線から参照できる厚みゼロの面。 |
| `aux` | 任意の配列 | 軸やグリッドなどの描画補助。 |
| `visual_legend` | 任意の配列 | 見分けるべき意味と、作品内で使う表示の凡例。 |
| `coordinate_contexts` | 任意の配列 | 要素の位置を読むための局所原点、軸、単位と尺度。 |
| `comparisons` | 任意の配列 | 比較する対象、共通の条件、各ケースの条件と要素参照。 |
| `quantities` | 任意の配列 | 表示要素に対応する量、単位、値の状態、時点・事象・区間。 |

構造要素では `signification` が意味、`appearance` が幾何と表示、`meta` が識別情報を受け持ちます。`aux` は `appearance` と `meta` で構成されます。主要オブジェクトのフィールドは対応するJSON Schemaで規定します。

制作中の原資料・草稿・拘束や編集状態は、制作側で管理します。疎な点名を渡す作業入力には `.3dss-prep.json` があり、図を含む制作単位の保存には `.3dsl-work.json` があります。各形式の保持範囲は[制作と保存の案内](/docs/usage/create-save-read/)を参照してください。

### 文書メタデータ

| 項目 | 条件 | 意味 |
|---|---|---|
| `document_title` | 必須、文字列または日英表記 | 図のタイトル。 |
| `document_uuid` | 必須、UUID | 図の識別子。編集による同じ図の更新で使い続ける。 |
| `created_at`、`revised_at` | 必須、UTC、`YYYY-MM-DDThh:mm:ssZ`。秒は小数可 | 図の作成・更新日時。 |
| `schema_uri` | 必須、上表の固定値 | データ形式を識別する。 |
| `author` | 必須、ASCIIの英数字と `._-` に対応する名前または作者ID | 作者を識別する。スキーマの形式では `@ドメイン` も付加できる。 |
| `version` | 必須、SemVer形式 | 作品の改訂版。形式の版は `schema_uri` で決まる。 |
| `document_summary`、`reference` | 任意 | 作品の概要、資料参照。 |
| `coordinate_system`、`units`、`i18n` | 任意 | 座標系、座標の単位、基本言語。 |
| `generator`、`tags`、`creator_memo` | 任意 | 生成元URI、分類タグ、制作者メモ。 |

座標系は `Z+up/freeXY` です。指定を省略したときもこの座標系を使います。座標の単位 `units` は `m`、`cm`、`mm`、`non_si:px` から選べます。既定は `non_si:px` です。基本言語 `i18n` は `ja` または `en`、既定は `ja` です。日英表記のフィールドには文字列、または `ja`、`en` の値を持つオブジェクトを記述できます。

### 要素の識別と表示範囲

各点・線・面・補助要素の `meta.uuid` は文書内で一意の識別子です。任意の `tags` は `s:`、`m:`、`x:` に空白やコロンを含まない値を続けます。制作者メモは `creator_memo` に記録します。点・線・面の `meta.legend_refs` は作品内の凡例IDを参照します。

`appearance.visible` は表示可否、`frames` は表示フレームを指定します。フレーム番号は−9999から9999の整数で、配列の場合は1〜256個の異なる番号を指定します。フレームは表示を切り替える番号です。対象の時間は、作品がその対応を明示したときに読めます。

## 2. 座標と表示

位置と方向のベクトルは `[x,y,z]` の数値三つです。世界座標の+Zを上とします。幾何軸に割り当てる題材上の意味、基準、単位と、比較できる範囲は作品で定義します。回転の数値はラジアンです。

### 点

`points[]` には `appearance` と `meta` が必須です。`signification.name` は点の名前で、`appearance.position` は必須の位置です。`appearance.marker` は任意で、記述すると `primitive` と種類に応じた寸法が必要です。

| `primitive` | 条件付き必須項目 |
|---|---|
| `sphere` | `radius` |
| `box` | `size`（3軸の寸法） |
| `cone` | `radius`、`height` |
| `pyramid` | `base`（底面2辺）、`height` |
| `corona` | `inner_radius`、`outer_radius` |
| `none` | 追加寸法なし。文字やGLBと組み合わせられる。 |

寸法値の下限は0.0001です。`marker.common` には `orientation`、`scale`、`color`、`opacity`、`emissive`、`wireframe` を指定できます。既定は順に `[0,0,0]`、`[1,1,1]`、白、0.4、偽、偽です。

`marker.gltf` はGLB/glTFの参照 `url` と `scale`、`rotation`、`offset` を受け取ります。`marker.text` への文字の指定は後述します。

### 線

`lines[]` には `appearance` と `meta` が必須です。`signification.relation` を記述するときは次表から一つのキーと値を選びます。

| キー | 値 |
|---|---|
| `structural` | `association`、`containment`、`hierarchy` |
| `dynamic` | `causal`、`flow`、`influence`、`derivation`、`transformation`、`feedback`、`recursion`、`reflection` |
| `logical` | `equivalence`、`negation`、`implication`、`support`、`conflict` |
| `temporal` | `precedence`、`succession` |
| `meta` | `reference` |

`signification.sense` は `a_to_b`、`b_to_a`、`bidirectional`、`neutral` で向きを指定します。既定は `a_to_b` です。`signification.caption` には関係語を記します。描画する線の二端は `appearance.end_a` と `appearance.end_b` で指定します。それぞれ下表から一つの形式を選びます。

| 端点の形式 | 位置の決め方 |
|---|---|
| `{"ref": "点UUID"}` | 同じ図の `points[].appearance.position` を参照する。 |
| `{"surface_ref": "面UUID", "uv": [u, v]}` | 同じ図の面と面内取付位置を参照する。 |
| `{"coord": [x, y, z]}` | 世界座標を直接指定する。 |

端点のどちらを意味の始点として読むかは `sense` で決まります。参照先の種類、存在、UUIDの一意性は構造検査で確認します。

| `appearance` | 値と条件 |
|---|---|
| `line_type` | `straight`（既定）、`polyline`、`catmullrom`、`bezier`、`arc`。直線以外を指定すると `geometry` が必須。 |
| `geometry` | `dimension` は2か3。折線は `polyline_points`、ベジェは `bezier_controls`（制御点1〜2）、Catmull–Romは `catmullrom_points` と `catmullrom_tension`（0〜1）。円弧は `arc_center`、`arc_radius`、`arc_angle_start`、`arc_angle_end`、`arc_clockwise`。 |
| `line_style` | `solid`（既定）、`dashed`、`dotted`、`double`、`none`。 |
| `color`、`opacity`、`render_order` | 色、不透明度、描画順。既定はそれぞれ白、0.4、0。 |
| `arrow`、`effect`、`caption_text` | 矢印、動的な描画効果、キャプションの文字表示。 |

`arrow.primitive` は必須です。`line` は `length` と `thickness`、`cone` は `radius` と `height`、`pyramid` は `base` と `height` を併記します。`none` は形状なしです。`placement` で `end_a`、`end_b`（既定）、`both`、`none` を選べます。`auto_orient` の既定は真です。

`effect.effect_type` には `none`、`pulse`、`flow`、`glow` を指定できます。効果の強さ、速度、継続時間、繰り返し、位相、補間と幅は順に `amplitude`、`speed`、`duration`、`loop`、`phase`、`easing`、`width` です。描画の動き自体から対象の流量や経過時刻は決まりません。

### 面

`surfaces[]` の要素には `meta.uuid`、`signification.name`、`appearance` が必要です。`appearance.plane` は `xy`、`xz`、`yz`、`position` は面の中心、`size` は面内二辺の正の長さです。面の法線方向の厚みはゼロです。任意の `color`、`opacity`、`visible`、`frames`、`pattern: "hatch"` は面の表示を定めます。

| `plane` | U軸 | V軸 |
|---|---|---|
| `xy` | +X | +Y |
| `xz` | +X | +Z |
| `yz` | +Y | +Z |

端点の `uv` は各成分が0〜1の正規化座標です。`[0.5,0.5]` は面の中心、`[0.5,0]` はVが最小になる辺の中央です。面の中心に `(u−0.5) × size[0]` をU方向へ、`(v−0.5) × size[1]` をV方向へ加えると端点を得ます。面を移動・拡縮したときは、この取付位置から端点を再計算します。零の値も選択・参照できるよう、値の符号化と有限の選択領域を区別します。

### 補助要素

`aux[]` は `meta` が必須です。`appearance` に `position`、`orientation`、`opacity`、`visible`、`frames` と、次の `module` を指定できます。補助平面 `plate` はグリッドなどと同様に描画を支えます。意味と参照先を持つ面には `surfaces` を使います。

| `module` | 属性 |
|---|---|
| `grid` | `grid_type`（`cartesian`、`polar`）、`subdivisions`、`major_step`、`minor_step`、`color_major`、`color_minor`。 |
| `axis` | `length`、`labels`、`arrow`。形ごとの矢印寸法は線と同じ条件で指定。 |
| `plate` | `plane`（`xy`、`yz`、`zx`）、`position`、`size`、`reflectivity`、`opacity`。 |
| `shell` | `shell_type`（`sphere`、`box`、`hemisphere`、`quarter_sphere`、`eighth_sphere`）、`opacity`、`reflectivity`、`effect` の `edge_intensity`、`rimlight`、`glow_color`。 |
| `hud` | `follow_camera`、`scale_with_distance`。 |
| `extension` | `type`、`latex`、`parametric`。 |

`extension.latex` には `content` と `pose` が必須で、`render_mode`（`math`、`inline`、`block`）、`font_size`、`color`、`position` が任意です。`extension.parametric` には `type` が必須で、`version`、`params`、`bindings`（各項目に `target`、`expression`）、`seed` が任意です。式の具体的な解釈は利用する制作・表示の処理に委ねます。

### 図内の文字

点の文字は `appearance.marker.text` に置き、`content` と `pose` を指定します。点文字の `align` は `left`・`center`・`right` と `top`・`middle`・`baseline` を `&` で結んだ値で、既定は `center&middle` です。線の文言は `signification.caption`、表示は `appearance.caption_text` に記します。

| 設定 | 値と意味 |
|---|---|
| `pose.front`、`pose.up` | 文字面の表を向く方向と、字の上の方向を世界座標のベクトルで指定。既定の姿勢は+Yを表、+Zを上とする。 |
| `writing_mode` | `horizontal-tb`（既定）は `right = up × front` に沿って読む。`vertical-rl` は `−up` に沿って読み、次の列は `−right` 側に置く。 |
| 点の `size`、線と数式の `font_size` | `0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256` から選ぶ相対段階。既定は8。 |
| `font`、`font_weight` | 点と線の書体名、任意の太さ400または700。指定した太さを優先する。 |
| `color` | 文字の色。点マーカー、線や面の色はそれぞれ独立した表示属性。 |

数式の組版内部にある添字サイズは本文サイズの列挙値と別に扱います。カメラ操作後も図内の文字面は保存されたモデル上の姿勢を保ちます。

## 3. 局所の座標、比較、量

各レコードの `id` は同じ図の要素UUIDと重複しないUUIDです。用途に応じて次の配列を加えます。

### 局所の座標

`coordinate_contexts[]` の各項目に、`id`、`label`、`origin`（世界座標上の局所原点）、`axes`（1〜3本）、`element_refs`（1個以上の要素UUID）を指定します。`axes[]` は各軸の `direction`（`+x`、`-x`、`+y`、`-y`、`+z`、`-z`）、`label`、`kind` を持ちます。同じX・Y・Zの成分は一つの文脈で一度だけ使用します。

| `kind` | 軸から読めること |
|---|---|
| `category` | 対象や区分の違い。 |
| `order` | 向きに沿う順序。 |
| `measure` | 単位付きの値。`unit`、0より大きい `coordinate_units_per_unit`、`value_at_origin` を指定する。 |

計量軸の値は、原点から軸の正方向へ進んだ座標差を `coordinate_units_per_unit` で割り、`value_at_origin` に加えます。分類軸や順序軸は単位と換算値を省きます。

### 比較

`comparisons[]` の各項目に `id`、`label`、`subject`（比較対象）、`held_constant`（保持する観察条件や尺度）、`cases`（二つ以上）を指定します。`cases[]` は `label`、`condition`、`element_refs`（1個以上）を持ちます。読者は、どの条件を変えた比較なのかをケースとその対象要素から読みます。

### 量

`quantities[]` の各項目には `id`、`label`（何の量か）、`unit`、`subject`（対象または境界）、`basis`（時点・事象・区間など）、`status`、`element_ref`（対応する要素のUUID）が必要です。`status: "recorded"` のときだけ `value` を数値で指定します。記録済み0は `value: 0`、欠測は `missing`、適用外は `not_applicable` です。個別の量の単位 `unit` と文書の座標単位 `units` は、それぞれ量と表示空間の尺度を表します。

| `basis.kind` | 併記する属性 |
|---|---|
| `atemporal` | 対象の仕様寸法など、時間を置かない量。 |
| `instant` | 時間軸 `axis` と位置 `at`。 |
| `event` | `axis`、位置 `at`、事象点のUUID `event_ref`。 |
| `interval` | `axis` と区間の両端 `start`、`end`。集計方法 `aggregation` は `sum`、`integral`、`average`。 |

`axis` は符号付きの座標軸です。`at`、`start`、`end` は、基準原点から軸の正方向に投影した座標単位の値です。`context_ref` を指定する場合は、対応する局所座標の `id` を指定し、時間を使う量の `axis` がその文脈に含まれるようにします。基準原点にはその文脈の `origin` を使い、省略時は世界座標の `[0,0,0]` を使います。+Xと−Xのどちらを選んでも、進行方向に沿う区間は `start < end` です。期間の値と描画規則は[量の描き方](/docs/usage/author-3dss/#量と収支)を参照してください。

## 4. 作品内の凡例

`visual_legend[]` には、作品内で一意の `id`、読者向けの `label`、意味と使用範囲を述べる `description`、一つ以上の `applies_to` を指定します。対象の種類は `point_text`、`point_marker`、`line_caption`、`line`、`surface` です。見本の `sample` には `size`、`writing_mode`、`font`、`font_weight`、`color`、`pose`、`pattern` を指定できます。要素の `meta.legend_refs` は複数の凡例IDを参照できます。描画は各要素の `appearance` に従います。`sample` は凡例を再現するための見本です。

表示の色は `#RGB` または `#RRGGBB`、不透明度は0〜1です。作品で意味を担う色・模様には、その用途と対象を凡例に記録します。例えば、仕訳の借方・貸方、数量の増減、報告範囲での除外は、それぞれ作者が区別して記録する意味です。柄は面に描く表示仕様です。

## 5. 検証と互換性

1. `document_meta.schema_uri` で対応する固定版を選び、JSON Schemaで型・必須項目・列挙値・範囲を検査します。
2. 文書全体を見てUUIDの一意性、端点と凡例の参照先の存在と種類、局所軸の重複、時間軸の一致、区間の順序を構造検査で確認します。
3. 作者は、軸・配置・形・文字・表示が題材のどの事実を支えるか、保存した向きと読図結果が一致するかを確認します。制作と公開の基準は[図の制作ガイド](/docs/usage/author-3dss/)に記載します。

固定版には独自のスキーマと既定値があります。旧版文書を読むときは、その版の契約に従います。新版へ移す場合は変換内容と保持できる情報を確認したうえで、移行済みデータに新版の `schema_uri` を記録します。v1.1.4が許していた文字サイズのうち、v2.0.0の列挙値に含まれないものは、変換時に新しい文字階層を決めてから置き換えます。

## 6. 2点と1本の関係線を持つ例

次の例は位置・マーカー・方向付きの関係線・補助軸を含みます。`document_meta.version` は作品版1.0.0を、`schema_uri` は形式版2.0.0を指定しています。

```json
{
  "lines": [
    {
      "signification": {
        "relation": { "structural": "association" },
        "sense": "a_to_b"
      },
      "appearance": {
        "end_a": { "ref": "11111111-1111-4111-8111-111111111111" },
        "end_b": { "ref": "22222222-2222-4222-8222-222222222222" },
        "line_type": "straight",
        "line_style": "solid",
        "color": "#ffffff",
        "opacity": 0.4,
        "arrow": {
          "primitive": "cone",
          "radius": 0.5,
          "height": 1.0,
          "placement": "end_b",
          "auto_orient": true
        },
        "render_order": 0,
        "visible": true
      },
      "meta": {
        "uuid": "33333333-3333-4333-8333-333333333333",
        "tags": ["s:example", "m:association"]
      }
    }
  ],

  "points": [
    {
      "signification": {
        "name": {
          "ja": "ポイントA",
          "en": "Point A"
        }
      },
      "appearance": {
        "position": [0, 0, 0],
        "marker": {
          "primitive": "sphere",
          "radius": 4,
          "common": {
            "orientation": [0, 0, 0],
            "scale": [1, 1, 1],
            "color": "#ffffff",
            "opacity": 0.4,
            "emissive": false,
            "wireframe": false
          }
        },
        "visible": true
      },
      "meta": {
        "uuid": "11111111-1111-4111-8111-111111111111",
        "tags": ["s:node"]
      }
    },
    {
      "signification": {
        "name": {
          "ja": "ポイントB",
          "en": "Point B"
        }
      },
      "appearance": {
        "position": [16, 0, 0],
        "marker": {
          "primitive": "box",
          "size": [4, 4, 4],
          "common": {
            "orientation": [0, 0, 0],
            "scale": [1, 1, 1],
            "color": "#ffffff",
            "opacity": 0.4,
            "emissive": false,
            "wireframe": false
          }
        },
        "visible": true
      },
      "meta": {
        "uuid": "22222222-2222-4222-8222-222222222222",
        "tags": ["s:node"]
      }
    }
  ],

  "aux": [
    {
      "appearance": {
        "position": [0, 0, 0],
        "orientation": [0, 0, 0],
        "opacity": 0.4,
        "module": {
          "grid": {
            "grid_type": "cartesian",
            "subdivisions": 8,
            "major_step": 4,
            "minor_step": 1,
            "color_major": "#666666",
            "color_minor": "#333333"
          },
          "axis": {
            "length": 64,
            "labels": true,
            "arrow": {
              "primitive": "cone",
              "radius": 0.5,
              "height": 1.0
            }
          }
        },
        "visible": true
      },
      "meta": {
        "uuid": "44444444-4444-4444-8444-444444444444",
        "tags": ["x:helper"]
      }
    }
  ],

  "document_meta": {
    "document_title": {
      "ja": "3DSS サンプル文書",
      "en": "Sample 3DSS Document"
    },
    "document_summary": {
      "ja": "2 点間を結ぶ単純な association の例。",
      "en": "Simple example of an association between two points."
    },
    "document_uuid": "55555555-5555-4555-8555-555555555555",
    "version": "1.0.0",
    "author": "creator@example.com",
    "created_at": "2025-12-12T12:00:00Z",
    "revised_at": "2025-12-12T12:00:00Z",
    "schema_uri": "https://3dsl.jp/schemas/release/v2.0.0/3DSS.schema.json#v2.0.0",
    "coordinate_system": "Z+up/freeXY",
    "units": "non_si:px",
    "i18n": "ja",
    "tags": ["m:example", "x:doc"]
  }
}
```

### 面を参照する例

乾燥前の試料の保有水20 kgを表す面と、その面を参照する線の最小例です。+Yを実時間の進行方向とし、乾燥開始時点の座標を0とします。

```json
{
  "document_meta": {
    "document_title": "乾燥前の水分",
    "document_uuid": "4fb711c8-f18b-4a1c-8a0b-5e8401272c11",
    "schema_uri": "https://3dsl.jp/schemas/release/v2.0.0/3DSS.schema.json#v2.0.0",
    "version": "1.0.0",
    "author": "3dsl",
    "created_at": "2026-11-21T00:00:00Z",
    "revised_at": "2026-11-21T00:00:00Z"
  },
  "surfaces": [
    {
      "signification": { "name": "乾燥前の保有水20 kg" },
      "appearance": { "plane": "xz", "position": [0, 0, 10], "size": [4, 20] },
      "meta": { "uuid": "4fb711c8-f18b-4a1c-8a0b-5e8401272c12" }
    }
  ],
  "lines": [
    {
      "signification": {
        "relation": { "meta": "reference" },
        "sense": "a_to_b",
        "caption": "乾燥前を参照"
      },
      "appearance": {
        "end_a": { "coord": [0, 8, 0] },
        "end_b": { "surface_ref": "4fb711c8-f18b-4a1c-8a0b-5e8401272c12", "uv": [0.5, 0] },
        "arrow": { "primitive": "cone", "radius": 0.5, "height": 1 },
        "caption_text": {
          "pose": { "front": [1, 0, 0], "up": [0, 1, 0] },
          "writing_mode": "vertical-rl"
        }
      },
      "meta": { "uuid": "4fb711c8-f18b-4a1c-8a0b-5e8401272c13" }
    }
  ],
  "coordinate_contexts": [
    {
      "id": "4fb711c8-f18b-4a1c-8a0b-5e8401272c14",
      "label": "試料の乾燥",
      "origin": [0, 0, 0],
      "axes": [
        { "direction": "+y", "label": "乾燥開始からの時間", "kind": "measure", "unit": "h", "coordinate_units_per_unit": 4, "value_at_origin": 0 },
        { "direction": "+z", "label": "保有水量", "kind": "measure", "unit": "kg", "coordinate_units_per_unit": 1, "value_at_origin": 0 }
      ],
      "element_refs": ["4fb711c8-f18b-4a1c-8a0b-5e8401272c12", "4fb711c8-f18b-4a1c-8a0b-5e8401272c13"]
    }
  ],
  "quantities": [
    {
      "id": "4fb711c8-f18b-4a1c-8a0b-5e8401272c15",
      "label": "保有水量",
      "subject": "乾燥試料全体",
      "unit": "kg",
      "basis": { "kind": "instant", "axis": "+y", "at": 0 },
      "status": "recorded",
      "value": 20,
      "element_ref": "4fb711c8-f18b-4a1c-8a0b-5e8401272c12",
      "context_ref": "4fb711c8-f18b-4a1c-8a0b-5e8401272c14"
    }
  ]
}
```

面の下辺中央で線端は `[0,0,0]` になります。名付けた局所尺度では、面の高さ20座標単位は20 kgに当たります。

## 7. 変更履歴

| 版 | 日付 | 変更 | 状態 |
|---|---|---|---|
| 2.0.0 | 2026-11-21 | 参照可能な面、文字階層と書字方向、作品内の表示凡例、局所座標・比較・量の記録を規定。形式版は固定URI、作品版は独立したSemVerで表記。 | release |
| 1.1.4   | 2026-01-12 | text pose SSOT化(front/up vec3配列) 等） | stable |
| 1.1.2   | 2026-01-11 | `text_pose` 導入：`marker.text.plane` / `caption_text.plane` / `extension.latex.plane` を `pose(front/up vec3配列)` に置換。`marker.text.align` 正規表記を `&` 区切りに統一（互換入力としてスペース区切りはノーマライズ可）。 | stable |
| 1.1.1   | 2025-12-25 | 実装時に判明した不具合修正 | stable |
| 1.1.0   | 2025-12-12 | `$defs` 再編（geometry/labels/meta）、units 既定値の見直し、document_meta の拡張ほか | stable |
| 1.0.2   | 2025-12-03 | 実装時に判明した不具合修正等                                                     | stable |
| 1.0.1   | 2025-11-23 | 実装時に判明した不具合修正等                                                     | stable |
| 1.0.0   | 2025-10-21 | 初版確定                                                               | stable |
