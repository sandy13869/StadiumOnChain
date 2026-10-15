// Exercise the hook with a controlled wallet/RPC; never sends a transaction.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const ts = require("typescript");
const { parseUnits } = require("viem");
const source = ts.transpileModule(
  fs.readFileSync(
    require("node:path").join(__dirname, "../src/hooks/useExchange.ts"),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
function setup({ receiptStatus = "success", rejection } = {}) {
  const writes = [],
    receipts = [];
  let complete;
  const receipt = new Promise((resolve) => {
    complete = resolve;
  });
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === "react") return { useState: () => [false, () => {}] };
      if (name === "viem") return { parseUnits };
      if (name === "../wallet")
        return {
          CONTRACT_ADDRESSES: {
            usdc: "usdc",
            streamToken: "sprx",
            accessController: "controller",
          },
        };
      if (name === "wagmi")
        return {
          useWriteContract: () => ({
            writeContractAsync: async (request) => {
              writes.push(request);
              if (rejection) throw rejection;
              return "0x123";
            },
          }),
          usePublicClient: () => ({
            waitForTransactionReceipt: async (request) => {
              receipts.push(request);
              await receipt;
              return { status: receiptStatus };
            },
          }),
        };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { hook: exports.useExchange(), writes, receipts, complete };
}
test("USDC approval waits for a confirmed receipt before allowing the buy", async () => {
  const { hook, writes, receipts, complete } = setup();
  let approved = false;
  const flow = hook.approveUSDC("1.25").then(() => {
    approved = true;
    return hook.buySPRX("1.25");
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(approved, false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].args[1], 1250000n);
  assert.equal(receipts.length, 1);
  complete();
  await flow;
  assert.equal(writes[1].functionName, "buyTokens");
  assert.equal(writes[1].args[0], 1250000n);
});
test("reverted approval prevents a subsequent swap", async () => {
  const { hook, writes, complete } = setup({ receiptStatus: "reverted" });
  const flow = hook.approveUSDC("2").then(() => hook.buySPRX("2"));
  complete();
  await assert.rejects(flow, /reverted/);
  assert.equal(writes.length, 1);
});
test("wallet rejection is surfaced without requesting a receipt", async () => {
  const { hook, receipts } = setup({
    rejection: new Error("User rejected request"),
  });
  await assert.rejects(hook.approveSPRX("100"), /User rejected/);
  assert.equal(receipts.length, 0);
});
test("SPRX approvals and sells preserve 18 decimal precision", async () => {
  const { hook, writes, complete } = setup();
  complete();
  await hook.approveSPRX("1.000000000000000001");
  await hook.sellSPRX("1.000000000000000001");
  assert.equal(writes[0].args[1], 1000000000000000001n);
  assert.equal(writes[1].args[0], 1000000000000000001n);
});
