# EPTRC

[中文](./README.md) | [English](./README.en.md)

EPTRC（Easy Payment TRC）是一个轻量级 TRC20-USDT 支付网关

商户系统可以通过简单的 HTTP API + Webhook 轻松集成 USDT 收款能力

## 快速开始

```bash
bun install
bun run db:push
bun run dev
```

默认服务地址：`http://localhost:3000`

## Scripts

- `bun run dev`: 本地开发启动（热更新）
- `bun run check`: TypeScript 类型检查
- `bun run db:push`: 推送 Drizzle schema 到数据库
- `bun run build:bun`: 构建 Bun 运行时版本到 `dist/`
- `bun run build:linux-x64`: 构建 Linux x64 可执行文件
- `bun run build:windows-x64`: 构建 Windows x64 可执行文件
- `bun run build:darwin-x64`: 构建 macOS Intel x64 可执行文件
- `bun run build:darwin-arm64`: 构建 macOS Apple Silicon 可执行文件

## 鉴权

- `GET /` 无需鉴权
- 其他接口需要请求头 `X-API-KEY`

## 接入流程

1. 调用 `POST /paymentSession/create` 创建支付会话
2. 展示返回的 `address`，引导用户转账
3. 接收 Webhook（`payment.session.paid` 或 `payment.session.timeout`）
4. 需要时调用 `POST /paymentSession/detail` 做补偿查询
5. 定期调用 `POST /wallet/collection` 归集已支付钱包资金

## 金额精度

- 所有 `amount` 字段都使用链上最小单位的整数字符串
- TRC20-USDT 的 `decimals = 6`
- 换算示例：`1000000 = 1.000000 USDT`

## API

- 业务处理成功：返回 `HTTP 200`
- 业务处理失败：返回 `HTTP 4xx` 或 `HTTP 5xx`

### 健康检查

`GET /`

响应体示例（HTTP 200）：

```json
{
  "version": "1.0.0",
  "tronGridBaseUrl": "https://nile.trongrid.io",
  "contractAddress": "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"
}
```

### 创建支付会话

`POST /paymentSession/create`

请求体：

```json
{
  "metadata": "{\"orderId\":\"order.123\",\"userId\":\"user.456\"}",
  "notifyUrl": "https://api.merchant-system.com/eptrcNotify"
}
```

- `notifyUrl`: 必填，支付结果回调地址
- `metadata`: 选填，可传任意字符串，会在 webhook 中原样透传；推荐使用 JSON Object 字符串，方便商户反序列化

成功响应体示例（HTTP 200）：

```json
{
  "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d",
  "address": "TTU6hE7tn9UX9XxcbQ3fZMZY3SH4GfMYZy",
  "expiresAt": 1577934245000
}
```

### 查询支付会话详情

`POST /paymentSession/detail`

请求体：

```json
{
  "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d"
}
```

可用于查询会话状态、支付金额、链上交易 ID、是否已归集

成功响应体示例（HTTP 200）：

```json
{
  "id": "019bf34f-9bec-7000-9b43-2ff5f5b0427d",
  "metadata": "{\"orderId\":\"order.123\",\"userId\":\"user.456\"}",
  "amount": "1000000",
  "notifyUrl": "https://api.merchant-system.com/eptrcNotify",
  "address": "TTU6hE7tn9UX9XxcbQ3fZMZY3SH4GfMYZy",
  "status": "paid",
  "collected": 0,
  "blockchainTxId": "2a6a...",
  "paidAt": 1577934200000,
  "expiresAt": 1577934245000
}
```

### 钱包归集

`POST /wallet/collection`

请求体：

```json
{
  "toAddress": "TRx...target.address",
  "feePayerPrivateKey": "your.fee.payer.private.key"
}
```

- `toAddress`: 归集目标地址
- `feePayerPrivateKey`: 支付 TRX 网络费的钱包私钥
- 请确保该私钥对应地址有足够 TRX
- 不要在前端、日志或公开渠道暴露该私钥

成功响应体示例（HTTP 200）：

```json
{
  "collectionResults": [
    {
      "address": "Txxx...",
      "status": "collected",
      "amount": "1000000",
      "txId": "2a6a..."
    },
    {
      "address": "Tyyy...",
      "status": "no.balance"
    },
    {
      "address": "Tzzz...",
      "status": "error",
      "error": "collection.failed"
    }
  ]
}
```

## Webhook

当会话状态变化时，EPTRC 会向 `notifyUrl` 发送 `POST`

请求头：

```http
X-API-KEY: <WEBHOOK_KEY>
Content-Type: application/json
User-Agent: EPTRC/<version>
```

商户服务返回要求：

- 必须返回 `HTTP 200`，EPTRC 才会判定该次 Webhook 投递成功
- 返回非 `200` 状态码会按失败处理并进入重试（最大重试次数：10）
- 务必校验请求头 `X-API-KEY` 是否等于当前运行环境配置的 `WEBHOOK_KEY`，不匹配应拒绝请求

事件类型：

- `payment.session.paid`
- `payment.session.timeout`

`payment.session.paid` 示例：

```json
{
  "event": "payment.session.paid",
  "data": {
    "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d",
    "metadata": "{\"orderId\":\"order.123\",\"userId\":\"user.456\"}",
    "amount": "1000000"
  }
}
```

`payment.session.timeout` 示例：

```json
{
  "event": "payment.session.timeout",
  "data": {
    "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d",
    "metadata": "{\"orderId\":\"order.123\",\"userId\":\"user.456\"}"
  }
}
```

## 环境变量

```env
PORT=3000
API_KEY=it.is.very.secret
WEBHOOK_KEY=it.is.webhook.secret
DB_FILE_NAME=eptrc.sqlite
TRON_NETWORK=nile
```

- `PORT`: 服务端口，默认 `3000`
- `API_KEY`: 业务接口鉴权密钥（`X-API-KEY`）
- `WEBHOOK_KEY`: Webhook 鉴权密钥，未配置时回退到 `API_KEY`
- `DB_FILE_NAME`: 数据库文件名，默认 `eptrc.sqlite`
- `TRON_NETWORK`: `nile` 测试网，`main` 主网

## 支持我

如果这个项目对你有帮助，欢迎通过 TRON 地址支持我：

`TTU6hE7tn9UX9XxcbQ3fZMZY3SH4GfMYZy`
