import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { ethers, Signer, ContractFactory } from "ethers";
import TokenJson from "../assets/LotteryToken.json";
import LotteryJson from "../assets/Lottery.json";
import { useEffect } from "react";

let lotteryContract: ethers.Contract;
let token: ethers.Contract;
let accounts: Signer[];
let provider: ethers.providers.Provider;
// let contract: ethers.Contract;

const LOTTERY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const BET_PRICE = 0.000003;
const BET_FEE = 0.000002;
const TOKEN_RATIO = 1;

const Home: NextPage = () => {
	const options = {
		alchemy: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
		infura: process.env.NEXT_PUBLIC_INFURA_API_KEY,
	};

	provider = ethers.getDefaultProvider("goerli", options);
	const wallet = new ethers.Wallet(process.env.NEXT_PUBLIC_PRIVATE_KEY ?? "");

	const signer = wallet.connect(provider);

	accounts = [signer];
	useEffect(() => {
		// const contract = new ethers.Contract(
		// 	LOTTERY_CONTRACT_ADDRESS,
		// 	LotteryJson.abi,
		// 	provider
		// ).connect(signer);
		// lotteryContract = contract;
		// // initTokenContract();
		// console.log("lotteryContract", lotteryContract);
		initContracts();
	}, []);

	// async function initTokenContract() {
	// 	const tokenAddress = await lotteryContract.paymentToken();
	// 	const tokenFactory = new ContractFactory(
	// 		TokenJson.abi,
	// 		TokenJson.bytecode,
	// 		accounts[0]
	// 	);
	// 	token = tokenFactory.attach(tokenAddress);
	// 	console.log(`The lottery contract: ${lotteryContract.address}\n`);
	// 	console.log(`The token contract: ${token.address}\n`);
	// }

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
		console.log(`Contracts initialized at ${contract.address}]\n`);
		console.log(`The Token contract: ${token.address}\n`);
	}

	async function checkState() {
		console.log(lotteryContract, "lotteryContract checkstate");
		const state = await lotteryContract.betsOpen();
		console.log(`The lottery is ${state ? "open" : "closed"}\n`);
		if (!state) return;
		const currentBlock = await provider.getBlock("latest");
		const currentBlockDate = new Date(currentBlock.timestamp * 1000);
		const closingTime = await lotteryContract.betsClosingTime();
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
		const tx = await lotteryContract.openBets(
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

	async function bet(index: string, amount: string) {
		const allowTx = await token
			.connect(accounts[Number(index)])
			.approve(lotteryContract.address, ethers.constants.MaxUint256);
		await allowTx.wait();
		const tx = await lotteryContract
			.connect(accounts[Number(index)])
			.betMany(amount);
		const receipt = await tx.wait();
		console.log(`Bets placed (${receipt.transactionHash})\n`);
	}

	async function closeLottery() {
		const tx = await lotteryContract.closeLottery();
		const receipt = await tx.wait();
		console.log(`Bets closed (${receipt.transactionHash})\n`);
	}

	async function displayPrize(index: string): Promise<string> {
		const prizeBN = await lotteryContract.prize(accounts[Number(index)]);
		const prize = ethers.utils.formatEther(prizeBN);
		console.log(
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
		console.log(`Prize claimed (${receipt.transactionHash})\n`);
	}

	async function displayOwnerPool() {
		const balanceBN = await lotteryContract.ownerPool();
		const balance = ethers.utils.formatEther(balanceBN);
		console.log(`The owner pool has (${balance}) Tokens \n`);
	}

	async function withdrawTokens(amount: string) {
		const tx = await lotteryContract.ownerWithdraw(
			ethers.utils.parseEther(amount)
		);
		const receipt = await tx.wait();
		console.log(`Withdraw confirmed (${receipt.transactionHash})\n`);
	}

	async function burnTokens(index: string, amount: string) {
		const allowTx = await token
			.connect(accounts[Number(index)])
			.approve(lotteryContract.address, ethers.constants.MaxUint256);
		const receiptAllow = await allowTx.wait();
		console.log(`Allowance confirmed (${receiptAllow.transactionHash})\n`);
		const tx = await lotteryContract
			.connect(accounts[Number(index)])
			.returnTokens(ethers.utils.parseEther(amount));
		const receipt = await tx.wait();
		console.log(`Burn confirmed (${receipt.transactionHash})\n`);
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
						onClick={() => topUpAccountTokens("0", "0.0001")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>buy tokens</h2>
					</button>
					<button
						onClick={() => displayBalance("0")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>display balance</h2>
					</button>
					<button
						onClick={() => bet("0", "1")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>bet</h2>
					</button>
					<button
						onClick={() => closeLottery()}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>close lottery</h2>
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
			</main>
		</div>
	);
};

export default Home;
