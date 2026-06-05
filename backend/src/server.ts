(
	async () => {
		const mod = await import('./app');
		await mod.start();
	}
)();
