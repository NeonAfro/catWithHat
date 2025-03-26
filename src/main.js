export const PARAMS = {
	scale: 3,
	unitSize: 16
}

import {GameEngine} from "./gameengine.js";
import {AssetManager} from "./assetmanager.js"


const gameEngine = new GameEngine();

const ASSET_MANAGER = new AssetManager();
ASSET_MANAGER.queueDownload("./src/img/Melanie_Martinez.png");
ASSET_MANAGER.queueDownload("./src/img/ref_red.png");
ASSET_MANAGER.queueDownload("./src/img/baseTile.png");

ASSET_MANAGER.downloadAll(() => {
	const canvas = document.getElementById("gameWorld");
	const ctx = canvas.getContext("2d");

	gameEngine.init(ctx);

	gameEngine.start();

	gameEngine.addEntity( {
		update: function() {},
		draw: () => {
			ctx.drawImage(ASSET_MANAGER.getAsset("./src/img/Melanie_Martinez.png"), 0, 0, 32, 32, 
			canvas.width / 2 - (32 * PARAMS.scale / 2), canvas.height / 2 - (32 * PARAMS.scale / 2), 
			32 * PARAMS.scale, 32 * PARAMS.scale);
		}
	})
	const timeDisplay = {
		update: () => {
		},
		draw: (ctx) => {
			ctx.save();
			ctx.font = `48px comic sans`;
			ctx.fillStyle = 'white';
			ctx.fillText(`${Math.round(gameEngine.timer.gameTime * 10) / 10}`, 50, 50, 250);
			ctx.restore();
		}
	};
	
	gameEngine.addEntity(timeDisplay);

	const scale = 2;
	// Tile dimensions after scaling
	const TILE_WIDTH = 128;  // (64 * 2)
	const TILE_HEIGHT = 96;  // (48 * 2)

	// Grid size
	const GRID_WIDTH = 7;
	const GRID_HEIGHT = 7;

	// Centering the grid
	const centerX = 1024 / 2;  // Center of screen width
	const centerY = 768 / 4;   // Slightly higher for better fit

	// Load tile image
	const tileImg = ASSET_MANAGER.getAsset("./src/img/baseTile.png");
	ctx.drawImage(tileImg, 0, 0, 64, 48, 0, 0, 128, 96)

	for (let mapY = 0; mapY < GRID_HEIGHT; mapY++) {
		for (let mapX = 0; mapX < GRID_WIDTH; mapX++) {
			// Convert grid (mapX, mapY) to isometric (isoX, isoY)
			let isoX = (mapY - mapX) * 64 + centerX;
			let isoY = (mapY + mapX) * 32 + centerY;

			// Draw tile
			ctx.drawImage(tileImg, isoX, isoY, TILE_WIDTH, TILE_HEIGHT);
			gameEngine.addEntity({
				z: isoY,
				update: function(){},
				draw: (ctx) => {
					ctx.drawImage(tileImg, isoX, isoY, TILE_WIDTH, TILE_HEIGHT);
				}
			})
		}
	}

});
