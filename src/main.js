const gameEngine = new GameEngine();

const ASSET_MANAGER = new AssetManager();
ASSET_MANAGER.queueDownload("./src/img/Melanie_Martinez.png");
ASSET_MANAGER.queueDownload("./src/img/ref_red.png");

ASSET_MANAGER.downloadAll(() => {
	const canvas = document.getElementById("gameWorld");
	const ctx = canvas.getContext("2d");

	gameEngine.init(ctx);

	gameEngine.start();

	gameEngine.addEntity( {
		update: function() {},
		draw: () => {
			ctx.drawImage(ASSET_MANAGER.getAsset("./src/img/Melanie_Martinez.png"), 0, 0, 32, 32);
		}
	})
	const timeDisplay = {
		update: function() {},
		draw: (ctx) => {
			ctx.save();
			ctx.font = `48px comic sans`;
			ctx.fillStyle = 'white';
			ctx.fillText(`${Math.round(gameEngine.timer.gameTime * 10) / 10}`, 50, 50, 250);
			ctx.restore();
		}
	};
	gameEngine.addEntity(timeDisplay);
});
