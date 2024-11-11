if (typeof Promise.withResolvers === "undefined") {
	if (typeof window !== "undefined") {
		// @ts-expect-error This does not exist outside of polyfill which this is doing
		window.Promise.withResolvers = () => {
			// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
			// biome-ignore lint/style/useSingleVarDeclarator: <explanation>
			let resolve, reject;
			const promise = new Promise((res, rej) => {
				resolve = res;
				reject = rej;
			});
			return { promise, resolve, reject };
		};
	} else {
		// @ts-expect-error This does not exist outside of polyfill which this is doing
		global.Promise.withResolvers = () => {
			// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
			// biome-ignore lint/style/useSingleVarDeclarator: <explanation>
			let resolve, reject;
			const promise = new Promise((res, rej) => {
				resolve = res;
				reject = rej;
			});
			return { promise, resolve, reject };
		};
	}
}
