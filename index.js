#!/usr/bin/env node
// kids-stay-mcp — local stdio build.
//
// The primary deployment of this server is the hosted Streamable HTTP endpoint
// (https://mcp.kidsstay.workers.dev/mcp — no auth, read-only, rate-limited).
// This stdio build exists so the server can also run locally (MCP clients that
// prefer stdio, and automated registry checks). Introspection (initialize /
// tools/list / ping) is served entirely locally from the bundled tool
// definitions; tools/call fetches live verified data from the hosted endpoint,
// which is the single source of truth for the dataset (~2,000 hotels,
// refreshed after each site release).
//
// Zero runtime dependencies. Requires Node.js 18+ (built-in fetch).

import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENDPOINT = process.env.KIDS_STAY_MCP_ENDPOINT || 'https://mcp.kidsstay.workers.dev/mcp';
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INFO = { name: 'kids-stay-mcp', title: 'Kids Stay — 子連れ旅行の宿検索', version: '1.2.1', websiteUrl: 'https://kids-stay.com' };
const TOOLS = JSON.parse(readFileSync(join(HERE, 'tools.json'), 'utf8'));

const INSTRUCTIONS = [
  'kids-stay.com の検証済みデータで「赤ちゃん・子連れで泊まりやすい日本の宿」を検索できます。',
  '使い方: list_conditions で条件ID一覧 → search_hotels で条件×エリア検索 → get_hotel で詳細。',
  '設備・条件は変更されることがあります。ユーザーに提示する際は必ず page URL（施設ページ）を案内し、予約前に最新情報の確認を促してください。',
  '「おむつが取れていない子と大浴場に入れるか」系の質問は2段階で答えてください: bath_pre_potty_ok（湯船に浸かってOKと公式明記・厳しめ）と bath_baby_amenity（ベビーバス等の設備があり浴場に同伴できる＝湯船以外の選択肢）の両方を検索し、施設ごとの note（「貸切風呂のみ」「シール必須」等の但し書き）を必ず読んで区別して提示してください。',
  '表示について: 各結果の page URL は施設ページへのリンクです(計測用の引数が付いて長いので、宿名のリンクとして示すと読みやすくなります)。地図は施設ページにあります。',
  '© Kids Stay (kids-stay.com). 出典として施設ページURLを示したうえでAI応答に利用することは歓迎します。データの再配布・転売・競合データベースの構築・出典を偽る改変は禁止です。Use in AI responses with attribution (link to the facility page) is welcome; bulk redistribution, resale, or building competing databases is prohibited.',
  '利用条件の詳細: https://kids-stay.com/mcp/ および https://kids-stay.com/terms/',
  'データはツール呼び出し時にホスト版エンドポイントから取得します（常に最新）。',
].join('\n');

const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');

async function handleMessage(msg) {
  if (!msg || msg.jsonrpc !== '2.0') return rpcError(msg?.id ?? null, -32600, 'Invalid Request');
  const { id, method, params } = msg;
  if (id === undefined || id === null) return null; // notification → 応答なし

  switch (method) {
    case 'initialize': {
      const requested = params?.protocolVersion;
      const protocolVersion = PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0];
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS });
    case 'tools/call': {
      const name = params?.name;
      if (!TOOLS.some((t) => t.name === name)) return rpcError(id, -32602, `Unknown tool: ${name}`);
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
          body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: params?.arguments ?? {} } }),
        });
        if (!res.ok) {
          return rpcResult(id, { content: [{ type: 'text', text: `Upstream HTTP ${res.status} (${ENDPOINT})` }], isError: true });
        }
        const json = await res.json();
        if (json.error) return rpcError(id, json.error.code ?? -32603, json.error.message ?? 'Upstream error');
        return rpcResult(id, json.result);
      } catch (e) {
        return rpcResult(id, { content: [{ type: 'text', text: `Upstream fetch failed: ${e.message}` }], isError: true });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin });
let queue = Promise.resolve(); // 応答順序を受信順に保つ
rl.on('line', (line) => {
  line = line.trim();
  if (!line) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    send(rpcError(null, -32700, 'Parse error'));
    return;
  }
  queue = queue.then(async () => {
    const res = await handleMessage(msg);
    if (res) send(res);
  });
});
