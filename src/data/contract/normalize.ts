import { useQuery } from "react-query"
import { atom, selector } from "recoil"
import { fromPairs } from "ramda"
import { useLCDClient } from "@terra-money/wallet-provider"
import { div, gt, times } from "../../libs/math"
import { useAddress } from "../../hooks"
import { PriceKey, BalanceKey, StakingKey } from "../../hooks/contractKeys"
import { useStore, useStoreLoadable } from "../utils/loadable"
import { exchangeRatesQuery } from "../native/exchange"
import { useExternalBalances } from "../external/external"
import { useExternalPrices } from "../external/external"
import { protocolQuery, useProtocol } from "./protocol"
import { collateralOracleAssetInfoQuery } from "./collateral"
import {
  pairPoolQuery,
  oraclePriceQuery,
  usePairPool,
  useStakingRewardInfo,
  useGovStaker,
} from "./contract"
import { tokenBalanceQuery, lpTokenBalanceQuery } from "./contract"
import { mintAssetConfigQuery } from "./contract"

/* price */
export const nativePricesQuery = selector({
  key: "nativePrices",
  get: ({ get }) =>
    reduceNativePrice(get(exchangeRatesQuery).OracleDenomsExchangeRates.Result),
})

const nativePricesState = atom<Dictionary>({
  key: "nativePricesState",
  default: {},
})

export const pairPricesQuery = selector({
  key: "pairPrices",
  get: ({ get }) => dict(get(pairPoolQuery), calcPairPrice),
})

const pairPricesState = atom<Dictionary>({
  key: "pairPricesState",
  default: {},
})

export const oraclePricesQuery = selector({
  key: "oraclePrices",
  get: ({ get }) => dict(get(oraclePriceQuery), ({ rate }) => rate),
})

const oraclePricesState = atom<Dictionary>({
  key: "oraclePricesState",
  default: {},
})

export const prePricesQuery = selector({
  key: "prePrices",
  get: ({ get }) =>
    dict(
      get(mintAssetConfigQuery),
      ({ ipo_params }) => ipo_params?.pre_ipo_price ?? "0"
    ),
})

const prePricesState = atom<Dictionary>({
  key: "prePricesState",
  default: {},
})

export const endPricesQuery = selector({
  key: "endPrices",
  get: ({ get }) =>
    dict(get(mintAssetConfigQuery), ({ end_price }) => end_price),
})

const endPricesState = atom<Dictionary>({
  key: "endPricesState",
  default: {},
})

/* balance */
export const tokenBalancesQuery = selector({
  key: "tokenBalances",
  get: ({ get }) => {
    const result = get(tokenBalanceQuery)
    return result ? dict(result, ({ balance }) => balance) : {}
  },
})

const tokenBalancesState = atom<Dictionary>({
  key: "tokenBalancesState",
  default: {},
})

export const lpStakableBalancesQuery = selector({
  key: "lpStakableBalances",
  get: ({ get }) => {
    const result = get(lpTokenBalanceQuery)
    return result ? dict(result, ({ balance }) => balance) : {}
  },
})

const lpStakableBalancesState = atom<Dictionary>({
  key: "lpStakableBalancesState",
  default: {},
})

export const useLpStakedBalances = () => {
  const { data: result } = useStakingRewardInfo()
  return result ? reduceStakingReward(result, "bond_amount") : {}
}

export const useSlpStakedBalances = () => {
  const { data: result } = useStakingRewardInfo()
  return result ? reduceStakingReward(result, "bond_amount", true) : {}
}

export const useLpRewardBalances = () => {
  const { data: result } = useStakingRewardInfo()
  return result ? reduceStakingReward(result, "pending_reward") : {}
}

export const useSlpRewardBalances = () => {
  const { data: result } = useStakingRewardInfo()
  return result ? reduceStakingReward(result, "pending_reward", true) : {}
}

export const useGovStaked = () => {
  const { data: govStaker } = useGovStaker()
  return govStaker?.balance ?? "0"
}

/* protocol - asset info */
export const minCollateralRatioQuery = selector({
  key: "minCollateralRatio",
  get: ({ get }) =>
    dict(
      get(mintAssetConfigQuery),
      ({ min_collateral_ratio }) => min_collateral_ratio
    ),
})

export const minCollateralRatioState = atom<Dictionary>({
  key: "minCollateralRatioState",
  default: {},
})

export const multipliersQuery = selector<Dictionary>({
  key: "multiplierRatio",
  get: ({ get }) => ({
    uusd: "1",
    ...dict(
      get(collateralOracleAssetInfoQuery),
      ({ multiplier }) => multiplier
    ),
  }),
})

export const multipliersState = atom<Dictionary>({
  key: "multiplierState",
  default: {},
})

/* MIR Price */
export const MIRPriceQuery = selector({
  key: "MIRPrice",
  get: ({ get }) => {
    const { getToken } = get(protocolQuery)
    const pairPrices = get(pairPricesQuery)
    return pairPrices[getToken("MIR")]
  },
})

export const MIRPriceState = atom({
  key: "MIRPriceState",
  default: "0",
})

/* store: price */
export const usePairPrices = () => {
  return useStoreLoadable(pairPricesQuery, pairPricesState)
}

export const useOraclePrices = () => {
  return useStoreLoadable(oraclePricesQuery, oraclePricesState)
}

export const useNativePrices = () => {
  return useStoreLoadable(nativePricesQuery, nativePricesState)
}

export const usePrePrices = () => {
  return useStoreLoadable(prePricesQuery, prePricesState)
}

export const useEndPrices = () => {
  return useStoreLoadable(endPricesQuery, endPricesState)
}

/* store: balance */
export const useNativeBalances = () => {
  const lcd = useLCDClient()
  const address = useAddress()

  const { data } = useQuery("nativebalance", async () => {
    const [balance] = await lcd.bank.balance(address)
    return fromPairs(
      balance.toArray().map(({ amount, denom }) => [denom, amount.toString()])
    )
  })

  return data ?? {}
}

export const useTokenBalances = () => {
  return useStore(tokenBalancesQuery, tokenBalancesState)
}

/* store: staking balance */
export const useLpStakableBalances = () => {
  return useStore(lpStakableBalancesQuery, lpStakableBalancesState)
}

/* store: asset info */
export const useMinCollateralRatio = () => {
  return useStoreLoadable(minCollateralRatioQuery, minCollateralRatioState)
}

export const useMultipliers = () => {
  return useStoreLoadable(multipliersQuery, multipliersState)
}

/* store: MIR Price */
export const useMIRPrice = () => {
  return useStoreLoadable(MIRPriceQuery, MIRPriceState)
}

/* hooks:find */
export const useFindPrice = () => {
  const { getPriceKey } = useProtocol()

  const pairPrices = usePairPrices()
  const oraclePrices = useOraclePrices()
  const nativePrices = useNativePrices()
  const prePrices = usePrePrices()
  const endPrices = useEndPrices()
  const externalPrices = useExternalPrices()

  const dictionary = {
    [PriceKey.PAIR]: pairPrices,
    [PriceKey.ORACLE]: oraclePrices,
    [PriceKey.NATIVE]: nativePrices,
    [PriceKey.PRE]: prePrices,
    [PriceKey.END]: endPrices,
    [PriceKey.EXTERNAL]: externalPrices,
  }

  return (key: PriceKey, token: string) =>
    dictionary[getPriceKey(key, token)][token]
}

export const useFindBalance = () => {
  const { getBalanceKey } = useProtocol()

  const nativeBalances = useNativeBalances()
  const tokenBalances = useTokenBalances()
  const externalBalances = useExternalBalances()

  const dictionary = {
    [BalanceKey.NATIVE]: nativeBalances,
    [BalanceKey.TOKEN]: tokenBalances.contents,
    [BalanceKey.EXTERNAL]: externalBalances.contents,
  }

  return {
    contents: (token: string) => dictionary[getBalanceKey(token)][token],
    isLoading: [nativeBalances, tokenBalances, externalBalances].some(
      ({ isLoading }) => isLoading
    ),
  }
}

export const useFindStaking = () => {
  const lpStakableBalances = useLpStakableBalances()
  const lpStakedBalances = useLpStakedBalances()
  const slpStakedBalances = useSlpStakedBalances()
  const lpRewardBalances = useLpRewardBalances()
  const slpRewardBalances = useSlpRewardBalances()

  const dictionary = {
    [StakingKey.LPSTAKABLE]: lpStakableBalances.contents,
    [StakingKey.LPSTAKED]: lpStakedBalances,
    [StakingKey.SLPSTAKED]: slpStakedBalances,
    [StakingKey.LPREWARD]: lpRewardBalances,
    [StakingKey.SLPREWARD]: slpRewardBalances,
  }

  return {
    contents: (key: StakingKey, token: string) => dictionary[key][token],
    isLoading: [
      lpStakableBalances,
      lpStakedBalances,
      slpStakedBalances,
      lpRewardBalances,
      slpRewardBalances,
    ].some(({ isLoading }) => isLoading),
  }
}

export const useLiquidity = () => {
  const pairPool = usePairPool()
  return dict(pairPool, (item) => times(parsePairPool(item).uusd, 2))
}

/* utils */
export const dict = <Data, Item = string>(
  dictionary: Dictionary<Data> = {},
  selector: (data: Data, token?: string) => Item
) =>
  Object.entries(dictionary).reduce<Dictionary<Item>>(
    (acc, [token, data]) =>
      selector(data, token) ? { ...acc, [token]: selector(data, token) } : acc,
    {}
  )

/* helpers */
export const parsePairPool = (pool?: PairPool) => {
  if (!pool) return { uusd: "0", asset: "0", total: "0" }

  const { assets, total_share } = pool
  return {
    uusd: assets.find(({ info }) => "native_token" in info)?.amount ?? "0",
    asset: assets.find(({ info }) => "token" in info)?.amount ?? "0",
    total: total_share ?? "0",
  }
}

export const calcPairPrice = (param: PairPool) => {
  const { uusd, asset } = parsePairPool(param)
  return [uusd, asset].every((v) => v && gt(v, 0)) ? div(uusd, asset) : "0"
}

const reduceStakingReward = (
  { reward_infos }: StakingRewardInfo,
  key: "bond_amount" | "pending_reward",
  short = false
) =>
  reward_infos.reduce<Dictionary>(
    (acc, { asset_token, is_short, ...rest }) =>
      Object.assign(
        {},
        acc,
        is_short === short && { [asset_token]: rest[key] }
      ),
    {}
  )

const reduceNativePrice = (coins: MantleCoin[]): Dictionary => ({
  uusd: "1",
  uluna: coins.find(({ Denom }) => Denom === "uusd")?.Amount ?? "0",
})
