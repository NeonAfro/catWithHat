import {GameEngine} from "./gameengine.js";
import {AssetManager} from "./assetmanager.js"
import {Stage} from "./scene/stage.js"

const gameEngine = new GameEngine();

const ASSET_MANAGER = new AssetManager();
ASSET_MANAGER.queueDownload("./src/img/Melanie_Martinez.png");
ASSET_MANAGER.queueDownload("./src/img/dapperBird.png");

ASSET_MANAGER.queueDownload("./src/img/ref_red.png");
ASSET_MANAGER.queueDownload("./src/img/baseTile.png");
ASSET_MANAGER.queueDownload("./src/img/exampleTile.png");

ASSET_MANAGER.downloadAll(() => {
	const canvas = document.getElementById("gameWorld");
	const ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false; // prevent blurring via anti-aliasing.

	gameEngine.init(ctx);

	gameEngine.start();
	const stage = new Stage(gameEngine, ASSET_MANAGER);
});
