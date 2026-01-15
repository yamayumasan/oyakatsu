# オヤカツ API ドキュメント

## 概要

このディレクトリには、オヤカツのAPI仕様書が含まれています。

## ファイル構成

- `openapi.yaml` - OpenAPI 3.0 仕様書

## API仕様の閲覧方法

### 1. Swagger UI（オンライン）

[Swagger Editor](https://editor.swagger.io/) に `openapi.yaml` の内容を貼り付けて閲覧できます。

### 2. ローカルで閲覧

```bash
# Swagger UIをDockerで起動
docker run -p 8080:8080 -e SWAGGER_JSON=/api/openapi.yaml -v $(pwd)/docs/api:/api swaggerapi/swagger-ui

# ブラウザで http://localhost:8080 を開く
```

### 3. VS Code拡張機能

- [OpenAPI (Swagger) Editor](https://marketplace.visualstudio.com/items?itemName=42Crunch.vscode-openapi) をインストール
- `openapi.yaml` を開いてプレビュー

## APIエンドポイント一覧

### 認証 (Auth)

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/auth/send-code` | 認証コード送信 |
| POST | `/auth/verify-code` | 認証コード検証 |
| POST | `/auth/login` | メール/パスワードログイン |
| POST | `/auth/register` | 新規ユーザー登録 |
| POST | `/auth/refresh` | トークンリフレッシュ |
| POST | `/auth/logout` | ログアウト |

### ユーザー (Users)

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/users/me` | 自分のプロフィール取得 |
| PATCH | `/users/me` | プロフィール更新 |
| POST | `/users/me/avatar` | アバター画像アップロード |
| POST | `/users/me/role` | ロール設定（初回のみ） |
| POST | `/users/me/device-token` | デバイストークン登録 |

### ファミリー (Families)

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/families` | ファミリー作成（親のみ） |
| GET | `/families` | 所属ファミリー一覧取得 |
| GET | `/families/{familyId}` | ファミリー詳細取得 |
| PATCH | `/families/{familyId}` | ファミリー情報更新 |
| GET | `/families/{familyId}/members` | メンバー一覧 |
| GET | `/families/{familyId}/invite-code` | 招待コード取得 |
| POST | `/families/{familyId}/invite-code` | 招待コード再生成 |
| POST | `/families/join` | ファミリー参加（子供のみ） |
| POST | `/families/{familyId}/leave` | ファミリー脱退 |

### 報酬設定 (Reward Settings)

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/families/{familyId}/reward-settings` | 報酬設定一覧取得 |
| GET | `/families/{familyId}/reward-settings/{childId}` | 特定の子供への報酬設定取得 |
| PUT | `/families/{familyId}/reward-settings/{childId}` | 報酬設定を更新 |

### 通話 (Calls)

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/families/{familyId}/calls` | 通話履歴一覧 |
| POST | `/families/{familyId}/calls/request` | 通話リクエスト送信 |
| GET | `/families/{familyId}/calls/requests` | 受信した通話リクエスト一覧 |
| POST | `/families/{familyId}/calls/requests/{requestId}/accept` | 通話リクエスト承諾 |
| POST | `/families/{familyId}/calls/requests/{requestId}/decline` | 通話リクエスト拒否 |
| GET | `/families/{familyId}/calls/{callId}` | 通話詳細取得 |
| POST | `/families/{familyId}/calls/{callId}/end` | 通話終了 |

### 写真 (Photos)

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/families/{familyId}/photos` | 写真タイムライン取得 |
| POST | `/families/{familyId}/photos` | 写真投稿（子供のみ） |
| GET | `/families/{familyId}/photos/{photoId}` | 写真詳細取得 |
| DELETE | `/families/{familyId}/photos/{photoId}` | 写真削除 |
| GET | `/families/{familyId}/photos/{photoId}/reactions` | リアクション一覧取得 |
| POST | `/families/{familyId}/photos/{photoId}/reactions` | リアクション追加 |
| DELETE | `/families/{familyId}/photos/{photoId}/reactions/{reactionId}` | リアクション削除 |

### 報酬 (Rewards)

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/families/{familyId}/rewards` | 報酬履歴一覧 |
| POST | `/families/{familyId}/rewards/{rewardId}/confirm` | 報酬受領確認 |
| GET | `/families/{familyId}/rewards/summary` | 報酬サマリー取得 |

### ランキング (Rankings)

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/families/{familyId}/rankings` | ランキング取得 |
| GET | `/titles` | 称号一覧取得 |

### 通知 (Notifications)

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/notifications` | 通知一覧取得 |
| POST | `/notifications/{notificationId}/read` | 通知を既読にする |
| POST | `/notifications/read-all` | すべての通知を既読にする |
| GET | `/notifications/settings` | 通知設定取得 |
| PUT | `/notifications/settings` | 通知設定更新 |

## 認証

すべての認証済みエンドポイントでは、リクエストヘッダーにJWTトークンを含める必要があります。

```
Authorization: Bearer <access_token>
```

## エラーレスポンス

すべてのエラーは以下の形式で返却されます：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

### 主なエラーコード

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `INVALID_REQUEST` | 400 | リクエストが不正 |
| `UNAUTHORIZED` | 401 | 認証が必要 |
| `FORBIDDEN` | 403 | アクセス権限がない |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `CONFLICT` | 409 | リソースが競合 |
| `TOO_MANY_REQUESTS` | 429 | リクエスト制限超過 |
| `INTERNAL_ERROR` | 500 | サーバー内部エラー |

## レート制限

- 認証エンドポイント: 10回/分
- その他のエンドポイント: 100回/分

制限を超えた場合は `429 Too Many Requests` が返却されます。
