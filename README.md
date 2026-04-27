# kerdos-x402-mcp

MCP server exposing **Kerdos Market Intelligence APIs** as tools for AI trading agents. Pay-per-call in USDC on Base mainnet via the [x402 protocol](https://x402.org). No API keys, no subscriptions, no signup.

## What it does

11 tools for crypto market intelligence:

| Tool | Price | What it returns |
|------|------:|-----------------|
| `get_market_overview` | $0.01 | One-call snapshot: BTC/ETH/SOL/GOLD prices + RSI + regime + funding + Fear & Greed |
| `get_sentiment` | $0.05 | Composite multi-analyst sentiment, ST + LT direction, contrarian flag |
| `get_regime` | $0.02 | BTC/ETH bull/bear regime (EMA50 1h) with composite confidence |
| `get_funding` | $0.01 | Hyperliquid perpetual funding rates + OI for BTC/ETH |
| `get_gold_signal` | $0.03 | XAU direction, confidence, RSI, 4h fib (HIP-3 gold perp) |
| `get_whale_alerts` | $0.01 | Whale wallet stance + on-chain capital flows |
| `get_liquidations` | $0.02 | OI velocity + cascade risk + large-trade ($50K+) tracking |
| `get_cvd` | $0.02 | Cumulative Volume Delta — taker buy/sell divergence on BTC/ETH |
| `get_cascade_risk` | $0.02 | Decision-ready cascade classifier (NONE/LOW/MODERATE/ELEVATED/HIGH) per coin |
| `get_funding_chaos` | $0.03 | Sub-12h funding sign-flip regime index for BTC/ETH/SOL |
| `get_composite_signal` | $0.06 | Bundled market state (regime + cascade + sentiment) at a discount |

## Setup

```bash
npm install -g kerdos-x402-mcp
```

Or run via npx (no install):

```bash
npx kerdos-x402-mcp
```

### Required env

```bash
EVM_PRIVATE_KEY=0x...   # YOUR private key (used to sign payment authorizations)
```

The MCP server uses your key only to authorize USDC transfers to the Kerdos receiver wallet on Base. Each tool call costs $0.01–$0.06.

### Optional env

```bash
KERDOS_X402_BASE_URL=https://nonvisceral-eloisa-mousily.ngrok-free.dev
```

## Claude Desktop config

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kerdos": {
      "command": "npx",
      "args": ["kerdos-x402-mcp"],
      "env": {
        "EVM_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

## How payment works

1. MCP client calls a tool (e.g. `get_market_overview`).
2. MCP server requests `https://...kerdos.../api/market-overview`.
3. Kerdos server returns `402 Payment Required` with a payment challenge.
4. `@x402/fetch` signs a USDC `transferWithAuthorization` using your key.
5. Server verifies the signature, settles via CDP facilitator on Base, returns the JSON response.

End-to-end latency: ~1-2 seconds per call. No interactive approval — payment happens transparently.

## Provider

Kerdos Market Intelligence — autonomous trading agent fleet on Hyperliquid + Base. Same signals power Kerdos's own bots' entry decisions.

- Discovery: `https://nonvisceral-eloisa-mousily.ngrok-free.dev/.well-known/x402`
- CDP Bazaar listing: 11 endpoints
- 402Index: 12 entries
- Verified domain (402Index)

## License

MIT — fork freely.

## Issues

GitHub issues on this repo for MCP-side bugs. For endpoint downtime, check `https://nonvisceral-eloisa-mousily.ngrok-free.dev/health`.
