import { updatePointsYT } from "../points/point-manager.js";
import { AccountSnapshotYT, RerunSnapshot } from "../schema/schema.ts";
import { PendleYieldTokenContext } from "../types/eth/pendleyieldtoken.js";
import { EVENT_USER_SHARE, POINT_SOURCE_YT } from "../types.js";
import { PENDLE_POOL_ADDRESSES, MISC_CONSTS } from "../consts.js";
import { readAllUserERC20Balances, readAllYTPositions } from "../multicall.js";

import { 
  getUnixTimestamp,
  getAllYTSnapshots,
  isPendleOrZeroAddress
} from "../helper.js";

const RERUN_KEY = `RERUN:${POINT_SOURCE_YT}`;

export async function processYTAccounts(
  ctx: PendleYieldTokenContext,
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
  let snapshots: AccountSnapshotYT[] = [];

  if (timestamp > MISC_CONSTS.CUTOFF_TIME) {
    timestamp = MISC_CONSTS.CUTOFF_TIME;
    if (!rerunSnapshot.ended) {
      rerunSnapshot.ended = true;
      rerunSnapshot.updatedAt = timestamp;
      ({ snapshots, addresses: allAddresses } = await getAllYTSnapshots(ctx));
      await ctx.store.upsert(rerunSnapshot);
    }
  }

  if (timestamp > rerunSnapshot.updatedAt + MISC_CONSTS.FULL_EXECUTION_INTERVAL) {
    ({ snapshots, addresses: allAddresses } = await getAllYTSnapshots(ctx));
    rerunSnapshot.updatedAt = timestamp;
    await ctx.store.upsert(rerunSnapshot);
  }

  for (let address of addressesToAdd)
    if (!allAddresses.includes(address) && !isPendleOrZeroAddress(address)) {
      let accountSnapshot = await ctx.store.get(AccountSnapshotYT, address);
      if (!accountSnapshot)
        accountSnapshot = new AccountSnapshotYT({
          id: address,
          lastImpliedHolding: BigInt(0),
          lastUpdatedAt: timestamp,
        });
      allAddresses.push(address);
      snapshots.push(accountSnapshot);
    }

  if(allAddresses.length == 0) return;
  
  const [allYTBalances, allYTPositions] = await Promise.all([
    readAllUserERC20Balances(
      ctx,
      allAddresses,
      ctx.contract.address
    ),
    readAllYTPositions(ctx, allAddresses)
  ]);

  const updateAccountPromises = [];

  for (let i = 0; i < allAddresses.length; i++) {
    const address = allAddresses[i];
    const balance = allYTBalances[i];
    const interestData = allYTPositions[i];
    let accountSnapshot = snapshots[i];

    const lastImpliedHolding = accountSnapshot.lastImpliedHolding;
    const lastUpdatedAt = accountSnapshot.lastUpdatedAt;

    if (interestData.lastPYIndex != 0n)
      accountSnapshot.lastImpliedHolding = 
        (balance * MISC_CONSTS.ONE_E18) / interestData.lastPYIndex +
        interestData.accruedInterest;

    accountSnapshot.lastUpdatedAt = timestamp;

    updateAccountPromises.push(
      updatePointsYT(
        ctx,
        POINT_SOURCE_YT,
        address,
        lastImpliedHolding,
        lastUpdatedAt,
        timestamp,
        timestamp,
        accountSnapshot
      )
    );
  }
  await Promise.all(updateAccountPromises);
}