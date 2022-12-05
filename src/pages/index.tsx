import type { NextPage } from "next";
import Head from "next/head";
import { ethers, Signer, ContractFactory } from "ethers";
import TokenJson from "../assets/LotteryToken.json";
import LotteryJson from "../assets/Lottery.json";
import { useEffect, useState } from "react";

let lotteryContract: ethers.Contract;
let token: ethers.Contract;
let accounts: Signer[];
let provider: ethers.providers.Provider;

const BET_PRICE = 0.000003;
const BET_FEE = 0.000002;
const TOKEN_RATIO = 1;
const LOTTERY_CONTRACT_ADDRESS = "0x2F4a3b3Da01D1282EB636cc392ec5a46F23cc0f4";
const TOKEN_CONTRACT_ADDRESS = "0xA8a6BAbC3B191b2959c2364e995809D567A54B25";

const Home: NextPage = () => {
	const [message, setMessage] = useState("");
	const [openBetsValue, setOpenBetsValue] = useState("0");
	const [buyTokensAddress, setBuyTokensAddress] = useState("");
	const [buyTokensAmount, setBuyTokensAmount] = useState("");
	const [displayBalanceWalletAddress, setDisplayBalanceWalletAddress] =
		useState("");
	const [myBetAmount, setMyBetAmount] = useState("");
	const [myBetWalletAddress, setMyBetWalletAddress] = useState("");

	const options = {
		alchemy: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
		infura: process.env.NEXT_PUBLIC_INFURA_API_KEY,
	};

	provider = ethers.getDefaultProvider("goerli", options);
	const wallet = new ethers.Wallet(process.env.NEXT_PUBLIC_PRIVATE_KEY ?? "");

	const signer = wallet.connect(provider);

	accounts = [signer];

	async function initContracts() {
		const contractFactory = new ContractFactory(
			LotteryJson.abi,
			LotteryJson.bytecode,
			accounts[0]
		);
		const contract = await contractFactory.deploy(
			"LotteryToken",
			"LT0",
			TOKEN_RATIO,
			ethers.utils.parseEther(BET_PRICE.toFixed(18)),
			ethers.utils.parseEther(BET_FEE.toFixed(18))
		);
		await contract.deployed();
		const tokenAddress = await contract.paymentToken();
		const tokenFactory = new ContractFactory(
			TokenJson.abi,
			TokenJson.bytecode,
			accounts[0]
		);
		token = tokenFactory.attach(tokenAddress);
		lotteryContract = contract;

		return setMessage(
			`The Lottery Contract is initialized at ${contract.address}\n The Token contract: ${token.address}\n`
		);
	}
	async function getContracts() {
		lotteryContract = new ethers.Contract(
			LOTTERY_CONTRACT_ADDRESS,
			LotteryJson.abi,
			provider
		).connect(signer);
		const tokenAddress = await lotteryContract.paymentToken();
		const tokenFactory = new ContractFactory(
			TokenJson.abi,
			TokenJson.bytecode,
			accounts[0]
		);

		token = tokenFactory.attach(tokenAddress);

		console.log(lotteryContract);
		console.log(token);

		setMessage(
			`
			The Lottery Contract is initialized at ${lotteryContract.address}\n
			The Token Contract is initialized at ${token.address}\n
			`
		);
	}

	async function checkState() {
		console.log(lotteryContract, "lotteryContract checkstate");
		const state = await lotteryContract.betsOpen();
		setMessage(`The lottery is ${state ? "open" : "closed"}\n`);
		if (!state) return;
		const currentBlock = await provider.getBlock("latest");
		const currentBlockDate = new Date(currentBlock.timestamp * 1000);
		const closingTime = await lotteryContract.betsClosingTime();
		const closingTimeDate = new Date(closingTime.toNumber() * 1000);

		setMessage(
			`The last block was mined at ${currentBlockDate.toLocaleDateString()} : ${currentBlockDate.toLocaleTimeString()}\n The lottery closes at ${closingTimeDate.toLocaleDateString()} : ${closingTimeDate.toLocaleTimeString()}\n`
		);
	}

	async function openBets(duration: string) {
		const currentBlock = await provider.getBlock("latest");
		setMessage(`The current block is ${currentBlock.number}`);
		const tx = await lotteryContract.openBets(
			currentBlock.timestamp + Number(duration)
		);
		const receipt = await tx.wait();
		setMessage(`Bets opened (${receipt.transactionHash})`);
	}

	async function topUpAccountTokens(index: string, amount: string) {
		// This works with "0" as an input for owners address
		const tx = await lotteryContract
			.connect(accounts[Number(index)])
			.purchaseTokens({ value: ethers.utils.parseEther(amount) });
		const receipt = await tx.wait();
		setMessage(`Tokens bought (${receipt.transactionHash})\n`);
	}

	async function displayBalance(address: string) {
		const balanceBN = await provider.getBalance(address);
		const balance = ethers.utils.formatEther(balanceBN);
		setMessage(`The account of address ${address} has ${balance} ETH\n`);
		return balance;
	}

	async function displayTokenBalance(index: string) {
		const balanceBN = await token.balanceOf(
			accounts[Number(index)].getAddress()
		);
		const balance = ethers.utils.formatEther(balanceBN);
		setMessage(
			`The account of address ${
				accounts[Number(index)]
			} has ${balance} Tokens\n`
		);
		return balance;
	}

	async function bet(index: string, amount: string) {
		const allowTx = await token
			.connect(accounts[Number(index)])
			.approve(lotteryContract.address, ethers.constants.MaxUint256);
		await allowTx.wait();
		const tx = await lotteryContract
			.connect(accounts[Number(index)])
			.betMany(amount);
		const receipt = await tx.wait();
		setMessage(`Bets placed (${receipt.transactionHash})\n`);
	}

	async function closeBets() {
		const tx = await lotteryContract.closeLottery();
		const receipt = await tx.wait();
		setMessage(`Bets closed (${receipt.transactionHash})\n`);
	}

	async function displayPrize(index: string): Promise<string> {
		const prizeBN = await lotteryContract.prize(accounts[Number(index)]);
		const prize = ethers.utils.formatEther(prizeBN);
		setMessage(
			`The account of address ${
				accounts[Number(index)]
			} has earned a prize of ${prize} Tokens\n`
		);
		return prize;
	}

	async function claimPrize(index: string, amount: string) {
		const tx = await lotteryContract
			.connect(accounts[Number(index)])
			.prizeWithdraw(ethers.utils.parseEther(amount));
		const receipt = await tx.wait();
		setMessage(`Prize claimed (${receipt.transactionHash})\n`);
	}

	async function displayOwnerPool() {
		const balanceBN = await lotteryContract.ownerPool();
		const balance = ethers.utils.formatEther(balanceBN);
		setMessage(`The owner pool has (${balance}) Tokens \n`);
	}

	async function withdrawTokens(amount: string) {
		const tx = await lotteryContract.ownerWithdraw(
			ethers.utils.parseEther(amount)
		);
		const receipt = await tx.wait();
		setMessage(`Withdraw confirmed (${receipt.transactionHash})\n`);
	}

	async function burnTokens(index: string, amount: string) {
		const allowTx = await token
			.connect(accounts[Number(index)])
			.approve(lotteryContract.address, ethers.constants.MaxUint256);
		const receiptAllow = await allowTx.wait();

		setMessage(`Allowance confirmed (${receiptAllow.transactionHash})\n`);
		const tx = await lotteryContract
			.connect(accounts[Number(index)])
			.returnTokens(ethers.utils.parseEther(amount));
		const receipt = await tx.wait();
		setMessage(`Burn confirmed (${receipt.transactionHash})\n`);
	}

	return (
		<div className="flex h-[98vh] flex-col items-center justify-center py-2">
			<Head>
				<title>Lottery dApp</title>
				<link rel="icon" href="/favicon.ico" />
			</Head>

			<main className=" flex w-full  flex-col items-center justify-center px-20 text-center">
				<h1 className="text-shadow text-6xl font-bold lower">
					Lottery <span className="normal-case">dApp</span>
				</h1>

				<div className="mt-3">
					<button
						onClick={() => getContracts()}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>Get contracts</h2>
					</button>
				</div>

				<div className="bg-slate-300 shadow-2xl shadow-black grid mt-11 grid-cols-3 gap-2">
					<div>
						<h2>check state</h2>
						<button
							onClick={() => checkState()}
							className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-3 text-white text-lg font-bold bg-blue-400"
						>
							Submit
						</button>
					</div>

					<div>
						<h2>Open Bets</h2>
						<input
							className="my-2"
							type="number"
							placeholder="Time in seconds"
							onChange={(e) => setOpenBetsValue(e.target.value)}
						/>
						<button
							onClick={() => openBets(openBetsValue)}
							className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-3 text-white text-lg font-bold bg-blue-400"
						>
							Submit
						</button>
					</div>
					<div>
						<h2>buy tokens</h2>
						<input
							className="my-2"
							type="text"
							placeholder="Wallet Address"
							onChange={(e) => setBuyTokensAddress(e.target.value)}
						/>
						<input
							className="my-2"
							type="number"
							placeholder="Amount to purchase"
							onChange={(e) => setBuyTokensAmount(e.target.value)}
						/>
						<button
							onClick={() =>
								topUpAccountTokens(buyTokensAddress, buyTokensAmount)
							}
							className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-3 text-white text-lg font-bold bg-blue-400"
						>
							Submit
						</button>
					</div>

					<div>
						<h2>Display Balance</h2>
						<input
							type="text"
							placeholder="Wallet Address"
							className="my-2"
							onChange={(e) => setDisplayBalanceWalletAddress(e.target.value)}
						/>
						<button
							onClick={() => displayBalance(displayBalanceWalletAddress)}
							className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-3 text-white text-lg font-bold bg-blue-400"
						>
							Submit
						</button>
					</div>

					<div>
						<h2>bet</h2>
						<input
							type="number"
							placeholder="wallet address"
							onChange={(e) => setMyBetWalletAddress(e.target.value)}
						/>
						<input
							type="number"
							placeholder="amount"
							onChange={(e) => setMyBetAmount(e.target.value)}
						/>
						<button
							onClick={() => bet("0", myBetAmount)}
							className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-3 text-white text-lg font-bold bg-blue-400"
						>
							Submit
						</button>
					</div>
					<button
						onClick={() => closeBets()}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>close bets</h2>
					</button>
					<button
						onClick={() => displayPrize("0")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>check player prize</h2>
					</button>
					<button
						onClick={() => withdrawTokens("1")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>withdraw</h2>
					</button>
					<button
						onClick={() => burnTokens("0", "1")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>burn tokens</h2>
					</button>
					<button
						onClick={() => claimPrize("0", "1")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>claim prize</h2>
					</button>
					<button
						onClick={() => displayOwnerPool()}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>display owner pool</h2>
					</button>
					<button
						onClick={() => displayTokenBalance("0")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>display token balance</h2>
					</button>
				</div>
				<button
					onClick={() => initContracts()}
					className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7 text-white text-lg font-bold bg-blue-400 mt-3"
				>
					<h2>Initialize new contract</h2>
				</button>

				<div className="my-4 py-4">{message}</div>
			</main>
		</div>
	);
};

export default Home;
