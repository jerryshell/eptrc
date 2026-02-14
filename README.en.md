# EPTRC

[中文](./README.md) | [English](./README.en.md)

EPTRC (Easy Payment TRC) is a lightweight TRC20-USDT payment gateway.

Merchant systems can integrate USDT collection with simple HTTP APIs and Webhooks.

## Quick Start

```bash
bun install
bun run dev
```

Default service URL: `http://localhost:3000`

## Scripts

- `bun run dev`: start local development server (hot reload)
- `bun run check`: run TypeScript type checking
- `bun run db:push`: push Drizzle schema to the database
- `bun run build:bun`: build Bun runtime version to `dist/`
- `bun run build:linux-x64`: build Linux x64 executable
- `bun run build:windows-x64`: build Windows x64 executable
- `bun run build:darwin-x64`: build macOS Intel x64 executable
- `bun run build:darwin-arm64`: build macOS Apple Silicon executable

## Authentication

- `GET /` does not require authentication
- Other endpoints require `X-API-KEY` in request headers

## Integration Flow

1. Call `POST /paymentSession/create` to create a payment session.
2. Show the returned `address` and guide the user to transfer funds.
3. Receive Webhooks (`payment.session.paid` or `payment.session.timeout`).
4. Call `POST /paymentSession/detail` for reconciliation when needed.
5. Periodically call `POST /wallet/collection` to collect paid wallet balances.

## Amount Precision

- All `amount` fields use integer strings in on-chain minimal units.
- TRC20-USDT uses `decimals = 6`.
- Conversion example: `1000000 = 1.000000 USDT`.

## API

- Business processing succeeded: return `HTTP 200`
- Business processing failed: return `HTTP 4xx` or `HTTP 5xx`

### Health Check

`GET /`

Response body example (HTTP 200):

```json
{
  "version": "1.0.0",
  "tronGridBaseUrl": "https://nile.trongrid.io",
  "contractAddress": "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"
}
```

### Create Payment Session

`POST /paymentSession/create`

Request body:

```json
{
  "metadata": "{\"orderId\":\"order.123\",\"userId\":\"user.456\"}",
  "notifyUrl": "https://api.merchant-system.com/eptrcNotify"
}
```

- `notifyUrl`: required, callback URL for payment result
- `metadata`: optional, can be any string and is passed through unchanged in Webhook payload; JSON object string is recommended for easier deserialization on merchant side

Successful response body example (HTTP 200):

```json
{
  "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d",
  "address": "TTU6hE7tn9UX9XxcbQ3fZMZY3SH4GfMYZy",
  "expiresAt": 1577934245000
}
```

### Query Payment Session Detail

`POST /paymentSession/detail`

Request body:

```json
{
  "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d"
}
```

Use this endpoint to query session status, paid amount, on-chain transaction ID, and collection state.

Successful response body example (HTTP 200):

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

### Wallet Collection

`POST /wallet/collection`

Request body:

```json
{
  "toAddress": "TRx...target.address",
  "feePayerPrivateKey": "your.fee.payer.private.key"
}
```

- `toAddress`: destination address for collection
- `feePayerPrivateKey`: private key of the wallet paying TRX network fees
- Ensure this private-key address has enough TRX
- Never expose this private key in frontend code, logs, or public channels

Successful response body example (HTTP 200):

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

When session status changes, EPTRC sends a `POST` request to `notifyUrl`.

Request headers:

```http
X-API-KEY: <WEBHOOK_KEY>
Content-Type: application/json
User-Agent: EPTRC/<version>
```

Merchant service response requirements:

- Your service must return `HTTP 200`; only then does EPTRC mark delivery as successful.
- Any non-`200` status code is treated as failed delivery and retried (max retries: 10).
- Always verify that request header `X-API-KEY` matches the `WEBHOOK_KEY` in your current runtime configuration; reject requests on mismatch.

Event types:

- `payment.session.paid`
- `payment.session.timeout`

`payment.session.paid` example:

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

`payment.session.timeout` example:

```json
{
  "event": "payment.session.timeout",
  "data": {
    "paymentSessionId": "019bf34f-9bec-7000-9b43-2ff5f5b0427d",
    "metadata": "{\"orderId\":\"order.123\",\"userId\":\"user.456\"}"
  }
}
```

## Environment Variables

```env
PORT=3000
API_KEY=it.is.very.secret
WEBHOOK_KEY=it.is.webhook.secret
DB_FILE_NAME=eptrc.sqlite
TRON_NETWORK=nile
```

- `PORT`: service port, default `3000`
- `API_KEY`: API auth key for business endpoints (`X-API-KEY`)
- `WEBHOOK_KEY`: auth key used for Webhook delivery; falls back to `API_KEY` if unset
- `DB_FILE_NAME`: database file name, default `eptrc.sqlite`
- `TRON_NETWORK`: `nile` for testnet, `main` for mainnet

## Support

If this project helps you, you can support it via this TRON address:

`TTU6hE7tn9UX9XxcbQ3fZMZY3SH4GfMYZy`
