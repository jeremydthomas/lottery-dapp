export default function Footer() {
	return (
		<footer className="relative bottom-0 left-0 right-0 bg-white">
			<div className="mx-auto max-w-7xl overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
				<p className="mt-8 text-center text-base text-gray-400">
					{`© ${new Date().getFullYear()} Property of Group Four, Inc. All rights reserved.`}
				</p>
			</div>
		</footer>
	);
}
