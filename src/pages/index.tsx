import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";

const Home: NextPage = () => {
	const router = useRouter();
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
						onClick={() => router.push("/check-state")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>check state</h2>
					</button>
					<button
						onClick={() => router.push("/open-bets")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>open bets</h2>
					</button>
					<button
						onClick={() => router.push("/top-up")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>Top up account tokens</h2>
					</button>
					<button
						onClick={() => router.push("/display-balance")}
						className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
					>
						<h2>display balance</h2>
					</button>
					<button
						onClick={() => router.push("/bet")}
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
