import "dotenv/config";
import { ethers } from "ethers";
import log from "./config/logger.js";
import inquirer from "inquirer";
import fs from "fs";
import https from "https";
import axios from "axios";

const config = JSON.parse(fs.readFileSync("./config/config.json"));
const {
  RPC_URL_SOMNIA_TESTNET,
  USDTG_ADDRESS,
  NIA_ADDRESS,
  ROUTER_ADDRESS,
  WSTT_ADDRESS,
  NETWORK_NAME
} = config;

let swapRunning = false;
let swapCancelled = false;
let wallets = [];
let proxies = [];
let swapConfig = {
  STT_NIA: { min: 0.001, max: 0.004, loop: 1 },
  STT_USDTG: { min: 0.001, max: 0.004, loop: 1 },
  NIA_STT: { min: 0.001, max: 0.004, loop: 1 },
  USDTG_STT: { min: 0.001, max: 0.004, loop: 1 }
};
let dailyMode = false;

const ERC20ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const ROUTER_ABI = [
  "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) public payable returns (uint256[])",
  "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) public returns (uint256[])",
  "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[])"
];

log.header();

function getRandomDelay() {
  return Math.random() * (60000 - 30000) + 30000;
}

function getRandomNumber(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(3));
}

async function askQuestions() {
  const questions = [
    {
      type: 'input',
      name: 'privateKeys',
      message: 'Enter private keys (comma separated):',
      validate: input => !!input.trim() || 'Private keys are required'
    },
    {
      type: 'confirm',
      name: 'useProxy',
      message: 'Do you want to use proxy?',
      default: false
    },
    {
      type: 'input',
      name: 'proxyList',
      message: 'Enter proxies (http://user:pass@ip:port, comma separated):',
      when: answers => answers.useProxy,
      validate: input => !!input.trim() || 'Proxy list is required'
    },
    {
      type: 'input',
      name: 'sttNiaMin',
      message: 'Swap STT » NIA - Min amount:',
      default: swapConfig.STT_NIA.min,
      validate: input => !isNaN(input) || 'Must be a number'
    },
    {
      type: 'input',
      name: 'sttNiaMax',
      message: 'Swap STT » NIA - Max amount:',
      default: swapConfig.STT_NIA.max,
      validate: input => !isNaN(input) || 'Must be a number'
    },
    {
      type: 'input',
      name: 'sttNiaLoop',
      message: 'Swap STT » NIA - Number of loops:',
      default: swapConfig.STT_NIA.loop,
      validate: input => Number.isInteger(Number(input)) && input > 0 || 'Must be a positive integer'
    },
    {
      type: 'input',
      name: 'sttUsdtgMin',
      message: 'Swap STT » USDTG - Min amount:',
      default: swapConfig.STT_USDTG.min,
      validate: input => !isNaN(input) || 'Must be a number'
    },
    {
      type: 'input',
      name: 'sttUsdtgMax',
      message: 'Swap STT » USDTG - Max amount:',
      default: swapConfig.STT_USDTG.max,
      validate: input => !isNaN(input) || 'Must be a number'
    },
    {
      type: 'input',
      name: 'sttUsdtgLoop',
      message: 'Swap STT » USDTG - Number of loops:',
      default: swapConfig.STT_USDTG.loop,
      validate: input => Number.isInteger(Number(input)) && input > 0 || 'Must be a positive integer'
    },
    {
      type: 'input',
      name: 'niaSttMin',
      message: 'Swap NIA » STT - Min amount:',
      default: swapConfig.NIA_STT.min,
      validate: input => !isNaN(input) || 'Must be a number'
    },
    {
      type: 'input',
      name: 'niaSttMax',
      message: 'Swap NIA » STT - Max amount:',
      default: swapConfig.NIA_STT.max,
      validate: input => !isNaN(input) || 'Must be a number'
    },
    {
      type: 'input',
      name: 'niaSttLoop',
      message: 'Swap NIA » STT - Number of loops:',
      default: swapConfig.NIA_STT.loop,
      validate: input => Number.isInteger(Number(input)) && input > 0 || 'Must be a positive integer'
    },
    {
      type: 'input',
      name: 'usdtgSttMin',
      message: 'Swap USDTG » STT - Min amount:',
      default: swapConfig.USDTG_STT.min,
      validate: input => !isNaN(input) || 'Must be a number'
    },
    {
      type: 'input',
      name: 'usdtgSttMax',
      message: 'Swap USDTG » STT - Max amount:',
      default: swapConfig.USDTG_STT.max,
      validate: input => !isNaN(input) || 'Must be a number'
    },
    {
      type: 'input',
      name: 'usdtgSttLoop',
      message: 'Swap USDTG » STT - Number of loops:',
      default: swapConfig.USDTG_STT.loop,
      validate: input => Number.isInteger(Number(input)) && input > 0 || 'Must be a positive integer'
    },
    {
      type: 'confirm',
      name: 'dailyMode',
      message: 'Run daily? (Y/N):',
      default: false
    }
  ];

  const answers = await inquirer.prompt(questions);

  swapConfig = {
    STT_NIA: {
      min: Number(answers.sttNiaMin),
      max: Number(answers.sttNiaMax),
      loop: Number(answers.sttNiaLoop)
    },
    STT_USDTG: {
      min: Number(answers.sttUsdtgMin),
      max: Number(answers.sttUsdtgMax),
      loop: Number(answers.sttUsdtgLoop)
    },
    NIA_STT: {
      min: Number(answers.niaSttMin),
      max: Number(answers.niaSttMax),
      loop: Number(answers.niaSttLoop)
    },
    USDTG_STT: {
      min: Number(answers.usdtgSttMin),
      max: Number(answers.usdtgSttMax),
      loop: Number(answers.usdtgSttLoop)
    }
  };
  
  dailyMode = answers.dailyMode;

  const privateKeys = answers.privateKeys.split(',').map(key => key.trim());
  
  if (answers.useProxy) {
    proxies = answers.proxyList.split(',').map(proxy => proxy.trim());

    if (proxies.length < privateKeys.length) {
      const lastProxy = proxies[proxies.length - 1];
      while (proxies.length < privateKeys.length) {
        proxies.push(lastProxy);
      }
    }
  }
  
  for (const [index, privateKey] of privateKeys.entries()) {
    try {
      let provider;
      if (proxies.length > 0) {
        const proxy = proxies[index];
        const agent = new https.Agent({
          rejectUnauthorized: false,
          proxy: {
            host: proxy.split('@')[1].split(':')[0],
            port: parseInt(proxy.split(':')[2]),
            auth: {
              username: proxy.split('//')[1].split(':')[0],
              password: proxy.split(':')[1].split('@')[0]
            }
          }
        });
        
        provider = new ethers.JsonRpcProvider(RPC_URL_SOMNIA_TESTNET, undefined, { agent });
        log.proxy(`Using proxy for wallet ${index + 1}: ${proxy}`);
      } else {
        provider = new ethers.JsonRpcProvider(RPC_URL_SOMNIA_TESTNET);
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      wallets.push(wallet);
      log.success(`Wallet ${index + 1} initialized: ${wallet.address}`);
    } catch (error) {
      log.error(`Failed to initialize wallet ${index + 1}: ${error.message}`);
    }
  }
  
  return wallets.length > 0;
}

async function getTokenBalance(wallet, tokenAddress) {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20ABI, wallet.provider);
    const balance = await contract.balanceOf(wallet.address);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    log.error(`Failed to get token balance for ${tokenAddress}: ${error.message}`);
    return "0";
  }
}

async function getWalletBalances(wallet) {
  try {
    const sttBalance = await wallet.provider.getBalance(wallet.address);
    const usdtgBalance = await getTokenBalance(wallet, USDTG_ADDRESS);
    const niaBalance = await getTokenBalance(wallet, NIA_ADDRESS);
    
    return {
      stt: ethers.formatEther(sttBalance),
      usdtg: usdtgBalance,
      nia: niaBalance
    };
  } catch (error) {
    log.error(`Failed to get wallet balances: ${error.message}`);
    return { stt: "0", usdtg: "0", nia: "0" };
  }
}

async function getLeaderboardData(wallet) {
  try {
    const headers = {
      'accept': 'application/json',
      'content-type': 'application/json'
    };
    
    const response = await axios.get(`https://api.somnia.exchange/api/leaderboard?wallet=${wallet.address}`, { headers });
    if (response.data.success && response.data.currentUser) {
      return {
        points: response.data.currentUser.points,
        rank: response.data.currentUser.rank
      };
    }
    return { points: 0, rank: 0 };
  } catch (error) {
    log.error(`Failed to get leaderboard data: ${error.message}`);
    return { points: 0, rank: 0 };
  }
}

async function approveToken(wallet, tokenAddress, amountIn) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, wallet);
    const allowance = await tokenContract.allowance(wallet.address, ROUTER_ADDRESS);
    const decimals = await tokenContract.decimals();
    const amount = ethers.parseUnits(amountIn.toString(), decimals);

    if (allowance < amount) {
      log.step(`Approving ${amountIn} token ${tokenAddress} for router...`);
      const approvalTx = await executeSwapWithNonceRetry(wallet, async (nonce) => {
        return await tokenContract.approve(ROUTER_ADDRESS, ethers.MaxUint256, { nonce });
      }, true);
      await approvalTx.wait();
      log.success(`Token ${tokenAddress} successfully approved`);
    }
    return true;
  } catch (error) {
    log.error(`Failed to approve token ${tokenAddress}: ${error.message}`);
    return false;
  }
}

async function getAmountOut(wallet, amountIn, path) {
  try {
    const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet.provider);
    const amounts = await routerContract.getAmountsOut(amountIn, path);
    return amounts[amounts.length - 1];
  } catch (error) {
    log.error(`Failed to get amount out: ${error.message}`);
    return ethers.parseEther("0");
  }
}

async function reportTransaction(wallet) {
  try {
    const payload = {
      address: wallet.address,
      taskId: "make-swap"
    };
    
    const headers = {
      'accept': 'application/json',
      'content-type': 'application/json'
    };
    
    const response = await axios.post("https://api.somnia.exchange/api/completeTask", payload, { headers });
    
    if (response.data.success) {
      log.success(`Transaction reported successfully: +${response.data.data.task.actualPointsAwarded} Points`);
      return true;
    } else {
      log.error(`Failed to report transaction: ${response.data.error || response.statusText}`);
      return false;
    }
  } catch (error) {
    log.error(`Failed to report transaction: ${error.message}`);
    return false;
  }
}

async function executeSwapWithNonceRetry(wallet, txFn, returnTx = false, maxRetries = 3) {
  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      let nonce = await wallet.provider.getTransactionCount(wallet.address, "pending");
      const tx = await txFn(nonce);
      if (returnTx) return tx;
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        return receipt;
      } else {
        throw new Error("Transaction reverted");
      }
    } catch (error) {
      if (error.message.includes("nonce too low") || 
          error.message.includes("nonce has already been used") || 
          error.message.includes("reverted")) {
        log.warn(`Transaction failed (attempt ${retry + 1}): ${error.message}. Getting new nonce...`);
        if (retry === maxRetries - 1) {
          throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
        }
        continue;
      } else {
        throw error;
      }
    }
  }
}

async function swapSttToToken(wallet, tokenAddress, tokenSymbol, minAmount, maxAmount) {
  try {
    const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const balances = await getWalletBalances(wallet);
    const sttBalance = parseFloat(balances.stt);
    
    const sttAmount = getRandomNumber(minAmount, maxAmount);
    
    if (sttBalance < sttAmount) {
      log.warn(`Insufficient STT balance: ${sttBalance} < ${sttAmount}`);
      return false;
    }

    const amountIn = ethers.parseEther(sttAmount.toString());
    const path = [WSTT_ADDRESS, tokenAddress];
    const amountOutMin = await getAmountOut(wallet, amountIn, path);
    const slippage = amountOutMin * BigInt(95) / BigInt(100);

    log.step(`Swapping ${sttAmount} STT ➯ ${tokenSymbol}`);

    const receipt = await executeSwapWithNonceRetry(wallet, async (nonce) => {
      return await routerContract.swapExactETHForTokens(
        slippage,
        path,
        wallet.address,
        deadline,
        { value: amountIn, gasLimit: 2000000, nonce }
      );
    });

    if (receipt.status === 1) {
      log.success(`Swap successful. Hash: https://shannon-explorer.somnia.network/tx/${receipt.hash}`);
      await reportTransaction(wallet);
      return true;
    }
    return false;
  } catch (error) {
    log.error(`Swap failed: ${error.message}`);
    return false;
  }
}

async function swapTokenToStt(wallet, tokenAddress, tokenSymbol, minAmount, maxAmount) {
  try {
    const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const balances = await getWalletBalances(wallet);
    
    const tokenBalance = parseFloat(balances[tokenSymbol.toLowerCase()]);
    const tokenAmount = getRandomNumber(minAmount, maxAmount);
    
    if (tokenBalance < tokenAmount) {
      log.warn(`Insufficient ${tokenSymbol} balance: ${tokenBalance} < ${tokenAmount}`);
      return false;
    }

    const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, wallet);
    const decimals = await tokenContract.decimals();
    const amountIn = ethers.parseUnits(tokenAmount.toString(), decimals);
    const path = [tokenAddress, WSTT_ADDRESS];
    const amountOutMin = await getAmountOut(wallet, amountIn, path);
    const slippage = amountOutMin * BigInt(95) / BigInt(100);

    const approved = await approveToken(wallet, tokenAddress, tokenAmount);
    if (!approved) return false;

    log.step(`Swapping ${tokenAmount} ${tokenSymbol} ➯ STT`);

    const receipt = await executeSwapWithNonceRetry(wallet, async (nonce) => {
      return await routerContract.swapExactTokensForETH(
        amountIn,
        slippage,
        path,
        wallet.address,
        deadline,
        { gasLimit: 2000000, nonce }
      );
    });

    if (receipt.status === 1) {
      log.success(`Swap successful. Hash: https://shannon-explorer.somnia.network/tx/${receipt.hash}`);
      await reportTransaction(wallet);
      return true;
    }
    return false;
  } catch (error) {
    log.error(`Swap failed: ${error.message}`);
    return false;
  }
}

async function runSwapsForWallet(wallet) {
  log.wallet(`Processing wallet: ${wallet.address}`);
  
  try {
    // Get initial wallet info
    const balances = await getWalletBalances(wallet);
    const leaderboard = await getLeaderboardData(wallet);
    
    log.info(`Balances - STT: ${balances.stt}, USDTg: ${balances.usdtg}, NIA: ${balances.nia}`);
    log.info(`Points: ${leaderboard.points}, Rank: ${leaderboard.rank}`);
    
    // Run STT to NIA swaps
    for (let i = 0; i < swapConfig.STT_NIA.loop; i++) {
      if (swapCancelled) break;
      log.step(`Running STT to NIA swap ${i+1}/${swapConfig.STT_NIA.loop}`);
      await swapSttToToken(wallet, NIA_ADDRESS, "NIA", swapConfig.STT_NIA.min, swapConfig.STT_NIA.max);
      
      if (i < swapConfig.STT_NIA.loop - 1 && !swapCancelled) {
        await delay(getRandomDelay());
      }
    }

    for (let i = 0; i < swapConfig.STT_USDTG.loop; i++) {
      if (swapCancelled) break;
      log.step(`Running STT to USDTG swap ${i+1}/${swapConfig.STT_USDTG.loop}`);
      await swapSttToToken(wallet, USDTG_ADDRESS, "USDTG", swapConfig.STT_USDTG.min, swapConfig.STT_USDTG.max);
      
      if (i < swapConfig.STT_USDTG.loop - 1 && !swapCancelled) {
        await delay(getRandomDelay());
      }
    }

    for (let i = 0; i < swapConfig.NIA_STT.loop; i++) {
      if (swapCancelled) break;
      log.step(`Running NIA to STT swap ${i+1}/${swapConfig.NIA_STT.loop}`);
      await swapTokenToStt(wallet, NIA_ADDRESS, "NIA", swapConfig.NIA_STT.min, swapConfig.NIA_STT.max);
      
      if (i < swapConfig.NIA_STT.loop - 1 && !swapCancelled) {
        await delay(getRandomDelay());
      }
    }

    for (let i = 0; i < swapConfig.USDTG_STT.loop; i++) {
      if (swapCancelled) break;
      log.step(`Running USDTG to STT swap ${i+1}/${swapConfig.USDTG_STT.loop}`);
      await swapTokenToStt(wallet, USDTG_ADDRESS, "USDTG", swapConfig.USDTG_STT.min, swapConfig.USDTG_STT.max);
      
      if (i < swapConfig.USDTG_STT.loop - 1 && !swapCancelled) {
        await delay(getRandomDelay());
      }
    }
    
    log.success(`All swaps completed for wallet: ${wallet.address}`);
  } catch (error) {
    log.error(`Error processing wallet ${wallet.address}: ${error.message}`);
  }
}

function delay(ms) {
  return new Promise(resolve => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (swapCancelled) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime >= ms) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
}

async function runAllSwaps() {
  swapRunning = true;
  swapCancelled = false;
  
  for (const wallet of wallets) {
    if (swapCancelled) break;
    await runSwapsForWallet(wallet);
    if (wallet !== wallets[wallets.length - 1] && !swapCancelled) {
      const delayTime = getRandomDelay();
      const minutes = Math.floor(delayTime / 60000);
      const seconds = Math.floor((delayTime % 60000) / 1000);
      log.info(`Waiting ${minutes} minutes ${seconds} seconds before next wallet`);
      await delay(delayTime);
    }
  }
  
  swapRunning = false;
  swapCancelled = false;
  
  if (dailyMode) {
    const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000);
    log.info(`Next run scheduled at: ${nextRun.toLocaleString()}`);
    setTimeout(runAllSwaps, 24 * 60 * 60 * 1000);
  }
}

async function main() {
  log.info("Initializing Somnia Exchange Auto Swap");
  
  if (!await askQuestions()) {
    log.error("Failed to initialize wallets. Exiting...");
    return;
  }
  
  await runAllSwaps();
}

main().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});