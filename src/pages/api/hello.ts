// // Next.js API route support: https://nextjs.org/docs/api-routes/introduction
// import type { NextApiRequest, NextApiResponse } from 'next'

// type Data = {
//   name: string
// }

// export default function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<Data>
// ) {
//   res.status(200).json({ name: 'John Doe' })
// }
import { ethers, BigNumber, Signer } from "ethers";
import * as TokenJson from "../../assets/LotteryToken.json";
import * as LotteryJson from "../../assets/LotteryToken.json";
import { ContractFactory } from "ethers";

const LOTTERY_CONTRACT_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const BET_PRICE = 1;
const BET_FEE = 0.2;

export class AppService {
	provider: ethers.providers.Provider;
	token: ethers.Contract;
	lotteryContract: ethers.Contract;
	accounts: Signer[];

	constructor() {
		const options = {
			alchemy: process.env.ALCHEMY_API_KEY,
			infura: process.env.INFURA_API_KEY,
		};
		this.provider = ethers.getDefaultProvider("goerli", options);
		const wallet1 = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
		const wallet2 = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
		const signer1 = wallet1.connect(this.provider);
		const signer2 = wallet2.connect(this.provider);
		this.accounts = [signer1, signer2];

		//this.initContracts();

		const contract = new ethers.Contract(
			LOTTERY_CONTRACT_ADDRESS,
			LotteryJson.abi,
			this.provider
		).connect(signer1);
		this.lotteryContract = contract;
		this.initTokenContract();
	}

	async initTokenContract() {
		const tokenAddress = await this.lotteryContract.paymentToken();
		const tokenFactory = new ContractFactory(
			TokenJson.abi,
			TokenJson.bytecode,
			this.accounts[0]
		);
		this.token = tokenFactory.attach(tokenAddress);
		console.log(`The lottery contract: ${this.lotteryContract.address}\n`);
		console.log(`The token contract: ${this.token.address}\n`);
	}

	//Deploys a new lottery contract
	async initContracts() {
		const factory = new ContractFactory(
			LotteryJson.abi,
			LotteryJson.bytecode,
			this.accounts[0]
		);
		const contract = await factory.deploy(
			"LotteryToken",
			"LTO",
			ethers.utils.parseEther(BET_PRICE.toFixed(18)),
			ethers.utils.parseEther(BET_FEE.toFixed(18))
		);
		await contract.deployed();
		const tokenAddress = await contract.paymentToken();
		const tokenFactory = new ContractFactory(
			TokenJson.abi,
			TokenJson.bytecode,
			this.accounts[0]
		);
		this.token = tokenFactory.attach(tokenAddress);
		this.lotteryContract = contract;
		console.log(`The lottery contract: ${contract.address}\n`);
		console.log(`The token contract: ${this.token.address}\n`);
	}

	async checkState() {
		const state = await this.lotteryContract.betsOpen();
		console.log(`The lottery is ${state ? "open" : "closed"}\n`);
		if (!state) return { status: state };

		const currentBlock = await this.provider.getBlock("latest");
		const currentBlockDate = new Date(currentBlock.timestamp * 1000);
		const closingTime = await this.lotteryContract.betsClosingTime();
		const closingTimeDate = new Date(closingTime.toNumber() * 1000);
		console.log(
			`The last block was mined at ${currentBlockDate.toLocaleDateString()} : ${currentBlockDate.toLocaleTimeString()}`
		);
		console.log(
			`lottery should close at ${
				closingTimeDate.toLocaleDateString
			} : ${closingTimeDate.toLocaleTimeString()}`
		);
		return {
			status: state,
			currentBlockTime: `${currentBlockDate.toLocaleDateString()} : ${currentBlockDate.toLocaleTimeString()}`,
			closingTime: `${closingTimeDate.toLocaleDateString()} : ${closingTimeDate.toLocaleTimeString()}`,
		};
	}

	async openBets(body: any) {
		const currentBlock = await this.provider.getBlock("latest");
		const tx = await this.lotteryContract.openBets(
			currentBlock.timestamp + Number(body.duration)
		);
		const receipt = await tx.wait();
		console.log(`Bets opened (${receipt.transactionHash})`);
		return receipt.transactionHash;
	}

	async displayBalance(index: string) {
		const balanceBN = await this.provider.getBalance(
			this.accounts[Number(index)].getAddress()
		);
		const balance = ethers.utils.formatEther(balanceBN);
		console.log(
			`The account of address ${
				this.accounts[Number(index)]
			} has ${balance} ETH\n`
		);
		return balance;
	}

	topUpAccountTokens(body: any) {
		return this.buyTokens(body.index, body.amount);
	}

	async buyTokens(index: string, amount: string) {
		const tx = await this.lotteryContract
			.connect(this.accounts[index])
			.purchaseTokens({
				value: ethers.utils.parseEther(amount),
			});
		const receipt = await tx.wait();
		console.log(`Tokens bought (${receipt.transactionHash})\n`);
		//show remaining eth balance
		const balance = this.displayBalance(index);
		//show token balance
		const tokenBalance = this.displayTokenBalance(index);
		return {
			txhash: receipt.transactionHash,
			balance: balance,
			tokenBalance: tokenBalance,
		};
	}

	async displayTokenBalance(index: string) {
		const balanceBN = await this.token.balanceOf(
			this.accounts[Number(index)].getAddress()
		);
		const balance = ethers.utils.formatEther(balanceBN);
		console.log(
			`The account of address ${
				this.accounts[Number(index)]
			} has ${balance} Tokens\n`
		);
		return balance;
	}

	async bet(body: any) {
		const allowTx = await this.token
			.connect(this.accounts[Number(body.index)])
			.approve(this.lotteryContract.address, ethers.constants.MaxUint256);
		await allowTx.wait();
		const tx = await this.lotteryContract.bet();
		const receipt = await tx.wait();
		console.log(`Bets placed (${receipt.transactionHash})\n`);
		let tokenBalance = this.displayTokenBalance(body.index);
		return { txhash: receipt.transactionHash, tokenBalance: tokenBalance };
	}

	async burnTokens(body: any) {
		const allowTx = await this.token
			.connect(this.accounts[Number(body.index)])
			.approve(this.lotteryContract.address, ethers.constants.MaxUint256);
		const receiptAllow = await allowTx.wait();
		console.log(`Allowance confirmed (${receiptAllow.transactionHash})\n`);
		const tx = await this.lotteryContract
			.connect(this.accounts[Number(body.index)])
			.returnTokens(ethers.utils.parseEther(body.amount));
		const receipt = await tx.wait();
		console.log(`Burn confirmed (${receipt.transactionHash})\n`);
		return receipt.transactionHash;
	}

	async withdraw(body: any) {
		const tx = await this.lotteryContract.ownerWithdraw(
			ethers.utils.parseEther(body.amount)
		);
		const receipt = await tx.wait();
		console.log(`Withdraw confirmed (${receipt.transactionHash})\n`);
		return receipt.transactionHash;
	}

	async closeBets() {
		const tx = await this.lotteryContract.closeLottery();
		const receipt = await tx.wait();
		console.log(`Bets closed (${receipt.transactionHash})\n`);
		return true;
	}

	async checkPlayerPrize(body: any) {
		const prizeBN = await this.lotteryContract.prize(
			this.accounts[Number(body.index)]
		);
		const prize = ethers.utils.formatEther(prizeBN);
		console.log(
			`The account of address ${
				this.accounts[Number(body.index)]
			} has earned a prize of ${prize} Tokens\n`
		);
		return prize;
	}

	async claimPrize(body: any) {
		const tx = await this.lotteryContract
			.connect(this.accounts[Number(body.index)])
			.prizeWithdraw(ethers.utils.parseEther(body.amount));
		const receipt = await tx.wait();
		console.log(`Prize claimed (${receipt.transactionHash})\n`);
		return receipt.transactionHash;
	}

	async displayOwnerPool() {
		const balanceBN = await this.lotteryContract.ownerPool();
		const balance = ethers.utils.formatEther(balanceBN);
		console.log(`The owner pool has (${balance}) Tokens \n`);
		return balance;
	}
}
