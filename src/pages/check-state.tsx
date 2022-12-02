import { NextPage } from "next";
import { useRouter } from "next/router";

const CheckState: NextPage = () => {
	const router = useRouter();

	return (
		<div>
			<button
				className="hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring focus:ring-slate-400 rounded p-7  text-white text-lg font-bold bg-blue-400"
				onClick={() => router.push("/")}
			>
				Back
			</button>
		</div>
	);
};

export default CheckState;
