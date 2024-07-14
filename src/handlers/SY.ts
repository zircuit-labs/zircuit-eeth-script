import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20";
import { updatePointsSY } from "../points/point-manager.js";
import { readAllUserERC20Balances } from "../multicall.js";

import { EVENT_USER_SHARE, POINT_SOURCE_SY } from "../types.js";

import {
  getUnixTimestamp,
  getAllSYSnapshots,
  isPendleOrZeroAddress,
} from "../helper.js";

import { AccountSnapshotSY, RerunSnapshot } from "../schema/schema.ts";
import { PENDLE_POOL_ADDRESSES, MISC_CONSTS } from "../consts.js";
const RERUN_KEY = `RERUN:${POINT_SOURCE_SY}`;

/**
 * @dev 1 SY EETH = 1 EETH
 */

export async function processSYAccounts(
  ctx: ERC20Context,
  addressesToAdd: string[] = []
) {
  let timestamp = BigInt(getUnixTimestamp(ctx.timestamp));
  let rerunSnapshot = await ctx.store.get(RerunSnapshot, RERUN_KEY);
  if (!rerunSnapshot) {
    rerunSnapshot = new RerunSnapshot({
      id: RERUN_KEY,
      ended: false,
      updatedAt: timestamp,
    });
    await ctx.store.upsert(rerunSnapshot);
  }

  if (rerunSnapshot.ended) return;

  let allAddresses: string[] = [];
  let snapshots: AccountSnapshotSY[] = [];

  if (timestamp > MISC_CONSTS.CUTOFF_TIME) {
    timestamp = MISC_CONSTS.CUTOFF_TIME;
    if (!rerunSnapshot.ended) {
      rerunSnapshot.ended = true;
      rerunSnapshot.updatedAt = timestamp;
      ({ snapshots, addresses: allAddresses } = await getAllSYSnapshots(ctx));
      await ctx.store.upsert(rerunSnapshot);
    }
  }

  if (timestamp > rerunSnapshot.updatedAt + MISC_CONSTS.FULL_EXECUTION_INTERVAL) {
    ({ snapshots, addresses: allAddresses } = await getAllSYSnapshots(ctx));
    rerunSnapshot.updatedAt = timestamp;
    await ctx.store.upsert(rerunSnapshot);
  }

  for (let address of addressesToAdd)
    if (!allAddresses.includes(address) && !isPendleOrZeroAddress(address)) {
      let accountSnapshot = await ctx.store.get(AccountSnapshotSY, address);
      if (!accountSnapshot)
        accountSnapshot = new AccountSnapshotSY({
          id: address,
          lastBalance: BigInt(0),
          lastUpdatedAt: timestamp,
        });
      allAddresses.push(address);
      snapshots.push(accountSnapshot);
    }

  if(allAddresses.length == 0) return;

  const allSYBalances = await readAllUserERC20Balances(
    ctx,
    allAddresses,
    ctx.contract.address
  );

  const updateAccountPromises = [];

  for (let i = 0; i < allAddresses.length; i++) {
    const address = allAddresses[i];
    const balance = allSYBalances[i];
    const accountSnapshot = snapshots[i];

    const lastUpdatedAt = accountSnapshot.lastUpdatedAt
    const lastBalance = accountSnapshot.lastBalance

    accountSnapshot.lastUpdatedAt = timestamp;
    accountSnapshot.lastBalance = balance;

    updateAccountPromises.push(
      updatePointsSY(
        ctx,
        POINT_SOURCE_SY,
        address,
        lastBalance,
        lastUpdatedAt,
        timestamp,
        timestamp,
        accountSnapshot
      )
    );
  }
  await Promise.all(updateAccountPromises);
}
