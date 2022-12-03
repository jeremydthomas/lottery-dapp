import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { ethers, Signer, ContractFactory } from "ethers";
import TokenJson from "../assets/LotteryToken.json";
import LotteryJson from "../assets/Lottery.json";
import Bet from "./bet";

let lotteryContract: ethers.Contract;
let token: ethers.Contract;
let accounts: Signer[];
let provider: ethers.providers.Provider;
let contract: ethers.Contract;

const LOTTERY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const BET_PRICE = 1;
const BET_FEE = 0.2;
const TOKEN_RATIO = 1;

const Home: NextPage = () => {
	const router = useRouter();

	const options = {
		alchemy: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
		infura: process.env.NEXT_PUBLIC_INFURA_API_KEY,
	};
	provider = ethers.getDefaultProvider("goerli", options);
	const wallet1 = new ethers.Wallet(process.env.NEXT_PUBLIC_PRIVATE_KEY ?? "");
	const wallet2 = new ethers.Wallet(process.env.NEXT_PUBLIC_PRIVATE_KEY ?? "");
	const signer1 = wallet1.connect(provider);
	const signer2 = wallet2.connect(provider);
	accounts = [signer1, signer2];

	contract = new ethers.Contract(
		LOTTERY_CONTRACT_ADDRESS,
		LotteryJson.abi,
		provider
	).connect(signer1);
	lotteryContract = contract;
	// initTokenContract();

	async function initTokenContract() {
		const tokenAddress = await lotteryContract.paymentToken();
		const tokenFactory = new ContractFactory(
			TokenJson.abi,
			TokenJson.bytecode,
			accounts[0]
		);
		token = tokenFactory.attach(tokenAddress);
		console.log(`The lottery contract: ${lotteryContract.address}\n`);
		console.log(`The token contract: ${token.address}\n`);
	}

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
		console.log(`Contracts initialized at ${contract.address}`);
	}

	async function checkState() {
		const state = await contract.betsOpen();
		console.log(state);
		console.log(`The lottery is ${state ? "open" : "closed"}\n`);
		if (!state) return;
		const currentBlock = await provider.getBlock("latest");
		const currentBlockDate = new Date(currentBlock.timestamp * 1000);
		const closingTime = await contract.betsClosingTime();
		const closingTimeDate = new Date(closingTime.toNumber() * 1000);
		console.log(
			`The last block was mined at ${currentBlockDate.toLocaleDateString()} : ${currentBlockDate.toLocaleTimeString()}\n`
		);
		console.log(
			`lottery should close at ${closingTimeDate.toLocaleDateString()} : ${closingTimeDate.toLocaleTimeString()}\n`
		);
	}

	async function openBets(duration: string) {
		const currentBlock = await provider.getBlock("latest");
		const tx = await contract.openBets(
			currentBlock.timestamp + Number(duration)
		);
		const receipt = await tx.wait();
		console.log(`Bets opened (${receipt.transactionHash})`);
	}

	async function displayBalance(index: string) {
		const balanceBN = await provider.getBalance(
			accounts[Number(index)].getAddress()
		);
		const balance = ethers.utils.formatEther(balanceBN);
		console.log(
			`The account of address ${accounts[Number(index)]} has ${balance} ETH\n`
		);
		return balance;
	}

	async function topUpAccountTokens(index: string, amount: string) {
		const tx = await lotteryContract
			.connect(accounts[Number(index)])
			.purchaseTokens({ value: ethers.utils.parseEther(amount) });
		const receipt = await tx.wait();
		console.log(`Tokens bought (${receipt.transactionHash})\n`);
	}

	async function displayTokenBalance(index: string) {
		const balanceBN = await token.balanceOf(
			accounts[Number(index)].getAddress()
		);
		const balance = ethers.utils.formatEther(balanceBN);
		console.log(
			`The account of address ${
				accounts[Number(index)]
			} has ${balance} Tokens\n`
		);
		return balance;
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
				<div className="shadow-2xl shadow-black grid mt-11 grid-cols-3 gap-2">
					<button
						onClick={() => checkState()}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>check state</h2>
					</button>
					<button
						onClick={() => openBets("100")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>open bets</h2>
					</button>
					<button
						onClick={() => topUpAccountTokens("0", "1")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>Top up account tokens</h2>
					</button>
					<button
						onClick={() => displayBalance("0")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>display balance</h2>
					</button>
					<button
						onClick={() => bet()}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>bet</h2>
					</button>
					<button
						onClick={() => router.push("/close-bets")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>close bets</h2>
					</button>
					<button
						onClick={() => router.push("/check-prize")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>check player prize</h2>
					</button>
					<button
						onClick={() => router.push("/withdraw")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>withdraw</h2>
					</button>
					<button
						onClick={() => router.push("/burn-tokens")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>burn tokens</h2>
					</button>
				</div>
			</main>
		</div>
	);
};

export default Home;
