import {GameEngine} from "./gameengine.js";
import {AssetManager} from "./assetmanager.js"
import {Stage} from "./scene/stage.js"
import { FarmingLevel } from "./scene/level/farmingLevel.js"
import { Round2 } from "./scene/level/round2.js"
import { Round3 } from "./scene/level/round3.js"

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

	let currentLevel = new FarmingLevel(gameEngine, ASSET_MANAGER);
	gameEngine.addEntity(currentLevel);

	// Scene transition logic
	const originalUpdate = currentLevel.update.bind(currentLevel);
	currentLevel.update = function() {
		originalUpdate();
		if (this.showNextButton && this.game.click) {
			const { x, y, w, h } = this.nextButtonRect;
			const mouse = this.game.click;
			if (mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h) {
				this.removeFromWorld = true;
				const round2 = new Round2(gameEngine, ASSET_MANAGER);
				gameEngine.addEntity(round2);

				// Add transition from round2 to round3
				const origUpdate2 = round2.update.bind(round2);
				round2.update = function() {
					origUpdate2();
					if (this.showNextButton && this.game.click) {
						const { x, y, w, h } = this.nextButtonRect;
						const mouse = this.game.click;
						if (mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h) {
							this.removeFromWorld = true;
							const lineup = [this.units[0]];
							if (this.selectedRecruit) lineup.push(this.selectedRecruit);
							const round3 = new Round3(gameEngine, ASSET_MANAGER, lineup);
							gameEngine.addEntity(round3);
						}
					}
				};
			}
		}
	};
});
