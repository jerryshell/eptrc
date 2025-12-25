import { apiKey, tronGridBaseUrl, contractAbi, version } from "./constants";
import { TronWeb } from "tronweb";

export const tronWeb = new TronWeb({
  fullHost: tronGridBaseUrl,
  privateKey: "01",
});

type TronTxListResponse = {
  data: any[];
};

const createTrc20TransferParams = (toAddress: string, amount: string) => {
  return [
    {
      type: "address",
      value: toAddress,
    },
    {
      type: "uint256",
      value: amount,
    },
  ] as const;
};

const getChainParameterSun = async (
  client: TronWeb,
  parameterKey: "getEnergyFee" | "getTransactionFee",
  missingParameterErrorCode: string,
) => {
  const chainParameters = await client.trx.getChainParameters();
  const parameterValue = chainParameters.find(
    (parameter) => parameter.key === parameterKey,
  )?.value;
  console.dir({ [parameterKey]: parameterValue });

  if (!parameterValue || parameterValue <= 0) {
    throw new Error(missingParameterErrorCode);
  }

  return parameterValue;
};

const estimateBandwidthUsage = async ({
  client,
  contractAddress,
  transferParams,
  fromAddress,
}: {
  client: TronWeb;
  contractAddress: string;
  transferParams: ReturnType<typeof createTrc20TransferParams>;
  fromAddress: string;
}) => {
  const triggerResponse = await client.transactionBuilder.triggerSmartContract(
    contractAddress,
    "transfer(address,uint256)",
    {},
    [...transferParams],
    fromAddress,
  );

  const transactionRawHex = triggerResponse.transaction?.raw_data_hex;
  if (!transactionRawHex) {
    throw new Error("bandwidth.estimate.failed");
  }

  return Math.max(1, Math.ceil(transactionRawHex.length / 2));
};

const estimateBandwidthFeeSun = async ({
  client,
  contractAddress,
  transferParams,
  fromAddress,
}: {
  client: TronWeb;
  contractAddress: string;
  transferParams: ReturnType<typeof createTrc20TransferParams>;
  fromAddress: string;
}) => {
  const [bandwidthFeeSun, bandwidthUsage, accountResources] = await Promise.all(
    [
      getChainParameterSun(
        client,
        "getTransactionFee",
        "bandwidth.fee.not.available",
      ),
      estimateBandwidthUsage({
        client,
        contractAddress,
        transferParams,
        fromAddress,
      }),
      client.trx.getAccountResources(fromAddress),
    ],
  );

  const freeNetLimit = Number(accountResources.freeNetLimit ?? 0);
  const freeNetUsed = Number(accountResources.freeNetUsed ?? 0);
  const netLimit = Number(accountResources.NetLimit ?? 0);
  const netUsed = Number(accountResources.NetUsed ?? 0);

  const freeBandwidth = Math.max(0, freeNetLimit - freeNetUsed);
  const stakedBandwidth = Math.max(0, netLimit - netUsed);
  const availableBandwidth = freeBandwidth + stakedBandwidth;
  const missingBandwidth = Math.max(0, bandwidthUsage - availableBandwidth);

  return missingBandwidth * bandwidthFeeSun;
};

const estimateTrc20TransferFeeSun = async ({
  client,
  contractAddress,
  transferParams,
  fromAddress,
}: {
  client: TronWeb;
  contractAddress: string;
  transferParams: ReturnType<typeof createTrc20TransferParams>;
  fromAddress: string;
}) => {
  const [estimateResult, energyFeeSun, bandwidthFeeSun] = await Promise.all([
    client.transactionBuilder.estimateEnergy(
      contractAddress,
      "transfer(address,uint256)",
      {},
      [...transferParams],
      fromAddress,
    ),
    getChainParameterSun(client, "getEnergyFee", "energy.fee.not.available"),
    estimateBandwidthFeeSun({
      client,
      contractAddress,
      transferParams,
      fromAddress,
    }),
  ]);

  const estimateSuccess = estimateResult.result?.result;
  const energyRequired = estimateResult.energy_required;
  if (!estimateSuccess || !energyRequired || energyRequired <= 0) {
    throw new Error("energy.estimate.failed");
  }

  const energyCostSun = Math.ceil(energyRequired * energyFeeSun * 1.2);

  // Add headroom to reduce failure caused by runtime variance.
  return Math.max(1, energyCostSun + bandwidthFeeSun);
};

export const fetchTronInTxList = ({
  walletAddress,
  contractAddress,
}: {
  walletAddress: string;
  contractAddress: string;
}) => {
  const url = `${tronGridBaseUrl}/v1/accounts/${walletAddress}/transactions/trc20?only_confirmed=true&contract_address=${contractAddress}&only_to=true`;
  return fetch(url)
    .then((response) => response.json())
    .then((responseBody: TronTxListResponse) => responseBody.data);
};

export const getTrc20Balance = async ({
  walletAddress,
  contractAddress,
}: {
  walletAddress: string;
  contractAddress: string;
}) => {
  try {
    const contract = await tronWeb.contract(contractAbi, contractAddress);
    const balance = await contract.balanceOf(walletAddress).call();
    return TronWeb.toBigNumber(balance).toString();
  } catch (error) {
    console.error(
      `Failed to get balance from wallet ${walletAddress} contract ${contractAddress}`,
      error,
    );
    return "0";
  }
};

export const sendTrc20Transaction = async ({
  privateKey,
  feePayerPrivateKey,
  toAddress,
  contractAddress,
  amount,
}: {
  privateKey: string;
  feePayerPrivateKey: string;
  toAddress: string;
  contractAddress: string;
  amount: string;
}) => {
  const transferParams = createTrc20TransferParams(toAddress, amount);

  const senderClient = new TronWeb({
    fullHost: tronGridBaseUrl,
    privateKey,
  });

  const tokenContract = await senderClient.contract(
    contractAbi,
    contractAddress,
  );

  const fromAddress = TronWeb.address.fromPrivateKey(privateKey);
  if (!fromAddress) {
    throw new Error("wallet.private.key.invalid");
  }

  const requiredFeeBalanceSun = await estimateTrc20TransferFeeSun({
    client: senderClient,
    contractAddress,
    transferParams,
    fromAddress,
  });
  console.dir({ requiredFeeBalanceSun });

  const currentTrxBalanceSun = Number(
    await senderClient.trx.getBalance(fromAddress),
  );
  if (currentTrxBalanceSun < requiredFeeBalanceSun) {
    const feePayerClient = new TronWeb({
      fullHost: tronGridBaseUrl,
      privateKey: feePayerPrivateKey,
    });

    const topUpAmountSun = requiredFeeBalanceSun - currentTrxBalanceSun;
    const topUpResult = await feePayerClient.trx.sendTransaction(
      fromAddress,
      topUpAmountSun,
    );
    if (!topUpResult.result) {
      throw new Error("top.up.trx.failed");
    }
  }

  const txId = await tokenContract.transfer(toAddress, amount).send({
    from: fromAddress,
    feeLimit: requiredFeeBalanceSun,
  });

  return txId;
};

export const sendEptrcRequest = ({
  url,
  requestBody,
  requestApiKey = apiKey,
}: {
  url: string;
  requestBody?: string;
  requestApiKey?: string;
}) => {
  return fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": `EPTRC/${version}`,
      "Content-Type": "application/json",
      "X-API-KEY": requestApiKey,
    },
    body: requestBody,
  });
};
