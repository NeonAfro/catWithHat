import { Animation } from "../animation.js";
export const testUnits = [ 
    { name: "dapperBird",
        attackRange: 1,
        hp: 5,
        attack: 1,
        defense: 0,
        exp: 1,
        attackSpeed: 1,
        moveSpeed: 0.4,
        asset: "./src/img/dapperBird.png"
     },
    {
        name: "yourmama"
    }
]
export const PARAMS = {
    scale: 2,
    TILE_WIDTH: 128,
    TILE_HEIGHT: 96,
}
export class Stage {
    constructor(game, asset, friendly, enemy){
        this.game = game;
        this.asset = asset;
        this.friendly = friendly;
        this.enemy = enemy;
        this.init()
    }
    init(){ // base
        console.log("here")

        const GRID_WIDTH = 7;
        const GRID_HEIGHT = 7;

        // Centering the grid
        const centerX = 1024 / 2;  // Center of screen width
        const centerY = 768 / 4;   // Slightly higher for better fit
        this.allBlocks = Array.from({ length: 7 }, () => Array(7).fill(null));
        // Load tile image
        const tileImg = this.asset.getAsset("./src/img/exampleTile.png");

        for (let mapY = 0; mapY < GRID_HEIGHT; mapY++) {
            for (let mapX = 0; mapX < GRID_WIDTH; mapX++) {
                let isoX = (mapY - mapX) * 64 + centerX - 64;
                let isoY = (mapY + mapX) * 32 + centerY;

                const block = new Block(isoX, isoY, tileImg, this.allBlocks);

                this.allBlocks[mapY][mapX] = block;

                // this.game.addEntity(block);
            }
        }
        const player = new CombatUnit(testUnits[0], this.allBlocks[1][2], this.asset.getAsset(testUnits[0].asset));
        this.allies = [player];
        this.game.addEntity(this); //
    }
    update(){
        this.allBlocks.forEach(row => {
            row.forEach(block => {
                const unit = block.occupied;
                if(unit){
                    if(unit.detail.hp <= 0) {
                        block.occupied = null;
                    }
                    unit.update(this.game.clockTick);
                }
            })
        })
    }
    draw(ctx){
        this.allBlocks.forEach(row => {
            row.forEach(block => {
                block.draw(ctx);
                if(block.occupied){
                    block.occupied.draw(ctx);
                }
            })
        })
    }
    setUp(){
        // setting up friendlies
        // max: 4 units.
        this.friendly.forEach(friend => {
            
        })
        // setting up enemy
    }
}
export class Block {
    constructor(isoX, isoY, img, allBlocks){
        this.z = isoY;
        this.y = isoY;
        this.x = isoX;
        this.img = img;
        this.allBlocks = allBlocks;
    }
    update(){

    }
    draw(ctx){
        ctx.drawImage(this.img, this.x, this.y, PARAMS.TILE_WIDTH, PARAMS.TILE_HEIGHT);
    }
}
export class CombatUnit { //Stage will create the img, and send it over.
    constructor(detail, block, img){
        this.img = img
        this.detail = detail;
        this.block = block;
        this.block.occupied = this;
        this.z = this.block.z + 1;
        this.x = this.block.x + (PARAMS.TILE_WIDTH - this.img.width * PARAMS.scale) / 2;
        this.y = this.block.y - (PARAMS.TILE_HEIGHT * 2/3);
        // this.animation = Animation.stretchAndSquash(5);
        // this.ticker = 0;
        // this.aniFrame = 0;
        // this.scaleX = 1;
        // this.scaleY = 1;
    }
    bfsMove() {
        // BFS algorithm to find the shortest path to the target block
        const queue = [];
        const visited = new Set();
        const directions = [
            { dx: -1, dy: 0 }, // left
            { dx: 1, dy: 0 },  // right
            { dx: 0, dy: -1 }, // up
            { dx: 0, dy: 1 }   // down
        ];

        queue.push({ block: this.block, path: [] });
        visited.add(this.block);

        while (queue.length > 0) {
            const { block, path } = queue.shift();

            if (block === targetBlock) {
                return path;
            }

            for (const direction of directions) {
                const newX = block.x + direction.dx;
                const newY = block.y + direction.dy;

                if (newX >= 0 && newX < this.allBlocks[0].length && newY >= 0 && newY < this.allBlocks.length) {
                    const neighborBlock = this.allBlocks[newY][newX];

                    if (!visited.has(neighborBlock)) {
                        visited.add(neighborBlock);
                        queue.push({ block: neighborBlock, path: [...path, neighborBlock] });
                    }
                }
            }
        }

        return null; // No path found
    }
    update(clockTick){
        this.ticker += clockTick;
        if(this.ticker >= 60/1000) {
            this.ticker = 0;
        }
    }
    draw(ctx){
        ctx.drawImage(this.img, 0, 0, this.img.width, this.img.height, this.x, this.y,
            this.img.width * PARAMS.scale, this.img.height * PARAMS.scale);
    }
    move(block){
        this.block.occupied = null;

        this.block = block;
        block.occupied = this;
        this.z = block.z;

        this.x = block.x + (PARAMS.TILE_WIDTH - this.img.width * PARAMS.scale) / 2;
        this.y = block.y - (PARAMS.TILE_HEIGHT * 2/3);
    }
}