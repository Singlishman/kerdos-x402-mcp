#!/usr/bin/env node
/**
 * kerdos-x402-mcp — MCP server exposing Kerdos market-intelligence endpoints.
 *
 * Each tool calls a paid x402 HTTP endpoint hosted by Kerdos. Payment happens
 * automatically in USDC on Base via @x402/fetch. Users supply their own
 * EVM_PRIVATE_KEY; the MCP server uses it solely to sign payment authorizations.
 *
 * Pricing per call: $0.01 – $0.06 USDC. See `/.well-known/x402` on the public
 * URL for the canonical pricing list.
 */

import { createRequire } from "module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const require = createRequire(import.meta.url);
const { wrapFetchWithPayment, x402Client } = require("@x402/fetch");
const { registerExactEvmScheme } = require("@x402/evm/exact/client");
const { createWalletClient, http, publicActions } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { base } = require("viem/chains");

const BASE_URL = process.env.KERDOS_X402_BASE_URL ||
  "https://nonvisceral-eloisa-mousily.ngrok-free.dev";

const RAW_KEY = process.env.EVM_PRIVATE_KEY;
if (!RAW_KEY) {
  console.error(
    "ERROR: EVM_PRIVATE_KEY not set. The MCP server signs USDC payments on Base " +
      "with this key. Each Kerdos endpoint costs $0.01–$0.06 per call."
  );
  process.exit(1);
}
const PRIVATE_KEY = RAW_KEY.startsWith("0x") ? RAW_KEY : `0x${RAW_KEY}`;

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http("https://mainnet.base.org"),
}).extend(publicActions);

// SDK requires .address at top level; viem keeps it nested under .account
const signer = Object.create(walletClient, {
  address: { value: walletClient.account.address, enumerable: true },
});

const x402c = new x402Client();
registerExactEvmScheme(x402c, { signer });
const fetchPaid = wrapFetchWithPayment(globalThis.fetch, x402c);

async function paidCall(path) {
  const url = `${BASE_URL}${path}`;
  const r = await fetchPaid(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Kerdos ${path} → HTTP ${r.status} ${txt.slice(0, 300)}`);
  }
  return r.json();
}

function ok(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function err(e) {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: String(e?.message || e) }) }],
    isError: true,
  };
}

const server = new McpServer({
  name: "kerdos-x402-mcp",
  version: "0.1.0",
});

server.tool(
  "get_market_overview",
  "[$0.01] One-call snapshot bundle: BTC/ETH/SOL/GOLD prices, RSI-14, EMA regime direction, Hyperliquid funding rates, open interest, Fear & Greed index. Best first call when an agent needs a per-tick decision context.",
  {},
  async () => {
    try { return ok(await paidCall("/api/market-overview")); }
    catch (e) { return err(e); }
  }
);

server.tool(
  "get_sentiment",
  "[$0.05] Composite multi-analyst crypto sentiment with short-term + long-term direction, strength, and contrarian indicator. Curated signal/noise separation.",
  {},
  async () => {
    try { return ok(await paidCall("/api/sentiment")); }
    catch (e) { return err(e); }
  }
);

server.tool(
  "get_regime",
  "[$0.02] BTC/ETH market trend direction (bull/bear regime) from EMA50 1h with composite confidence score.",
  {},
  async () => {
    try { return ok(await paidCall("/api/regime")); }
    catch (e) { return err(e); }
  }
);

server.tool(
  "get_funding",
  "[$0.01] Hyperliquid perpetual funding rates and open interest snapshot for BTC/ETH. For funding-arb screening or crowding detection.",
  {},
  async () => {
    try { return ok(await paidCall("/api/funding")); }
    catch (e) { return err(e); }
  }
);

server.tool(
  "get_gold_signal",
  "[$0.03] Gold (XAU) trading signal: direction, confidence, RSI(14), 4h fib retracement context. Sourced from Hyperliquid HIP-3 gold perp.",
  {},
  async () => {
    try { return ok(await paidCall("/api/gold-signal")); }
    catch (e) { return err(e); }
  }
);

server.tool(
  "get_whale_alerts",
  "[$0.01] On-chain whale wallet stance and capital-flow direction. Tracks bridge activity for high-net-worth crypto wallets.",
  {},
  async () => {
    try { return ok(await paidCall("/api/whale-alerts")); }
    catch (e) { return err(e); }
  }
);

server.tool(
  "get_liquidations",
  "[$0.02] Open interest velocity (5m/1h/24h), liquidation cascade risk per coin, and large-trade ($50K+) tracking on Hyperliquid for BTC/ETH/SOL.",
  {},
  async () => {
    try { return ok(await paidCall("/api/liquidations")); }
    catch (e) { return err(e); }
  }
);

server.tool(
  "get_cvd",
  "[$0.02] Cumulative Volume Delta — taker buy vs sell volume divergence on BTC/ETH (1h, 4h windows). Detects bullish accumulation and bearish exhaustion.",
  {},
  async () => {
    try { return ok(await paidCall("/api/cvd")); }
    catch (e) { return err(e); }
  }
);

server.tool(
  "get_cascade_risk",
  "[$0.02] Decision-ready cascade-risk classifier per coin (NONE / LOW / MODERATE / ELEVATED / HIGH) with recommended position-size discount and entry-threshold boost.",
  {},
  async () => {
    try { return ok(await paidCall("/api/cascade-risk")); }
    catch (e) { return err(e); }
  }
);

server.tool(
  "get_funding_chaos",
  "[$0.03] Funding chaos index — counts sub-12h funding-rate sign flips for BTC/ETH/SOL on Hyperliquid. Returns chaos level, per-asset flips, cycle counts, and implied bias (LONG_EXHAUSTION / SHORT_EXHAUSTION / MIXED / NEUTRAL).",
  {},
  async () => {
    try { return ok(await paidCall("/api/funding-chaos")); }
    catch (e) { return err(e); }
  }
);

server.tool(
  "get_composite_signal",
  "[$0.06] Bundled market-state inference — combines BTC/ETH regime direction, liquidation cascade risk + OI velocity, and composite sentiment in a single call. Discounted vs the a-la-carte total.",
  {},
  async () => {
    try { return ok(await paidCall("/api/composite-signal")); }
    catch (e) { return err(e); }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
