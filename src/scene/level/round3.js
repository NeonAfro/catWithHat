import { Block } from "../../scene/stage.js";

const ENEMY_IMG_PATH = "./src/img/Melanie_Martinez.png";
const UNIT_IMG_PATH = "./src/img/dapperBird.png";

// PlayerUnit class for both hero and recruited enemy
class PlayerUnit {
    constructor(img, block, level, hp = 5, attack = 1, size = 64) {
        this.img = img;
        this.block = block;
        this.level = level;
        this.size = size;
        this.dragging = false;
        this.z = block ? block.z + 30 : 10000;
        this.hp = hp;
        this.attack = attack;
        this.alive = true;
        this.team = "player";
    }
    setBlock(block) {
        if (this.block) this.block.unit = null;
        this.block = block;
        if (block) block.unit = this;
        this.z = block ? block.z + 30 : 10000;
    }
    isClicked(mouse) {
        if (!mouse) return false;
        let cx, cy;
        if (this.block) {
            cx = this.block.x + 64;
            cy = this.block.y + 48;
        } else {
            cx = this.level.unitArea.x + this.level.unitArea.w / 2;
            cy = this.level.unitArea.y + this.level.unitArea.h / 2;
        }
        const dx = mouse.x - cx;
        const dy = mouse.y - cy;
        return dx * dx + dy * dy <= this.size * this.size;
    }
    update() {}
    draw(ctx) {
        if (!this.alive) return;
        let x, y;
        if (this.dragging) {
            x = this.level.game.mouse.x - this.size / 2;
            y = this.level.game.mouse.y - this.size / 2;
        } else if (this.block) {
            x = this.block.x + 64 - this.size / 2;
            y = this.block.y + 48 - this.size / 2;
        } else {
            // In unit area
            x = this.level.unitArea.x + this.level.unitArea.w / 2 - this.size / 2;
            y = this.level.unitArea.y + this.level.unitArea.h / 2 - this.size / 2;
        }
        ctx.save();
        ctx.drawImage(this.img, x, y, this.size, this.size);
        ctx.restore();
        // Draw HP
        if (this.block) {
            ctx.save();
            ctx.fillStyle = "#4f4";
            ctx.font = "18px Arial";
            ctx.fillText(`HP: ${this.hp}`, this.block.x + 40, this.block.y + 20);
            ctx.restore();
        }
        if (this.dragging) {
            ctx.save();
            ctx.strokeStyle = "#FFD700";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, this.size, this.size);
            ctx.restore();
        }
    }
}

// Enemy class (same as before)
class Enemy {
    constructor(img, block, allBlocks) {
        this.img = img;
        this.block = block;
        this.size = 64;
        this.z = block.z + 20;
        this.hp = 3;
        this.allBlocks = allBlocks;
        this.alive = true;
        this.team = "enemy";
    }
    update() {}
    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.drawImage(this.img, this.block.x + 32, this.block.y, this.size, this.size);
        ctx.restore();
        // Draw HP
        ctx.save();
        ctx.fillStyle = "#f44";
        ctx.font = "16px Arial";
        ctx.fillText(`HP: ${this.hp}`, this.block.x + 40, this.block.y + 20);
        ctx.restore();
    }
}

// BFS helper
function bfs(startBlock, targetBlocks, allBlocks) {
    if (!startBlock) return null;
    // Remove null/undefined blocks from targetBlocks
    targetBlocks = targetBlocks.filter(b => b);
    if (targetBlocks.length === 0) return null;

    const queue = [];
    const visited = new Set();
    queue.push({ block: startBlock, path: [] });
    visited.add(`${startBlock.mapX},${startBlock.mapY}`);
    while (queue.length > 0) {
        const { block, path } = queue.shift();
        if (targetBlocks.includes(block)) {
            return path.length > 0 ? path[0] : null;
        }
        for (const [dx, dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
            const nx = block.mapX + dx;
            const ny = block.mapY + dy;
            if (
                nx >= 0 && nx < allBlocks[0].length &&
                ny >= 0 && ny < allBlocks.length
            ) {
                const neighbor = allBlocks[ny][nx];
                const key = `${nx},${ny}`;
                if (!visited.has(key) && (!neighbor.unit || targetBlocks.includes(neighbor))) {
                    visited.add(key);
                    queue.push({ block: neighbor, path: [...path, neighbor] });
                }
            }
        }
    }
    return null;
}

export class Round3 {
    constructor(game, assetManager, lineup) {
        this.game = game;
        this.assetManager = assetManager;
        this.gridWidth = 7;
        this.gridHeight = 7;
        this.tileWidth = 128;
        this.tileHeight = 96;
        this.blocks = [];
        this.enemies = [];
        this.units = [];
        this.selectedUnit = null;
        this.unitArea = { x: 350, y: 650, w: 350, h: 100 };
        this.levelName = "Round 3";
        this.combatStarted = false;
        this.showCombatButton = false;
        this.combatButtonRect = { x: 420, y: 350, w: 180, h: 60 };
        this.combatTimer = 0;
        this.combatDelay = 0.7;
        this.init(lineup);
    }

    init(lineup) {
        // Centering the grid
        const centerX = 1024 / 2;
        const centerY = 768 / 4;
        const tileImg = this.assetManager.getAsset("./src/img/exampleTile.png");

        this.blocks = Array.from({ length: this.gridHeight }, () => Array(this.gridWidth).fill(null));
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                let isoX = (y - x) * 64 + centerX - 64;
                let isoY = (y + x) * 32 + centerY;
                const block = new Block(isoX, isoY, tileImg, this.blocks);
                block.mapX = x;
                block.mapY = y;
                block.unit = null;
                this.blocks[y][x] = block;
            }
        }

        // Place two enemies on the right edge
        const enemyImg = this.assetManager.getAsset(ENEMY_IMG_PATH);
        this.enemies.push(new Enemy(enemyImg, this.blocks[2][this.gridWidth - 1], this.blocks));
        this.enemies.push(new Enemy(enemyImg, this.blocks[4][this.gridWidth - 1], this.blocks));

        // Convert lineup to PlayerUnit instances
        this.units = [];
        for (const unit of lineup || []) {
            // If already a PlayerUnit, just reset its block
            if (typeof unit.setBlock === "function") {
                unit.level = this;
                unit.setBlock(null);
                this.units.push(unit);
            } else {
                // If it's a recruited enemy, wrap as PlayerUnit
                const img = unit.img || this.assetManager.getAsset(ENEMY_IMG_PATH);
                this.units.push(new PlayerUnit(img, null, this, 3, 1, 64));
            }
        }
    }

    update() {
        if (!this.combatStarted) {
            // Drag and drop logic for player units (only on left edge)
            if (this.game.click) {
                if (this.selectedUnit && this.selectedUnit.dragging) {
                    const mouse = this.game.click;
                    let dropped = false;
                    // Only allow drop on left edge tiles
                    for (let y = 0; y < this.gridHeight; y++) {
                        const block = this.blocks[y][0];
                        const cx = block.x + 64;
                        const cy = block.y + 48;
                        const dist = Math.hypot(mouse.x - cx, mouse.y - cy);
                        if (dist < 48 && !block.unit) {
                            this.selectedUnit.setBlock(block);
                            dropped = true;
                            break;
                        }
                    }
                    if (!dropped) {
                        this.selectedUnit.setBlock(null);
                    }
                    this.selectedUnit.dragging = false;
                    this.selectedUnit = null;
                } else {
                    // Start dragging a unit if clicked
                    for (const unit of this.units) {
                        if (unit.isClicked(this.game.click)) {
                            this.selectedUnit = unit;
                            unit.dragging = true;
                            break;
                        }
                    }
                }
            }
            // Show combat button if all units are placed
            this.showCombatButton = this.units.length > 0 && this.units.every(u => u.block);
            // Handle combat button click
            if (this.showCombatButton && this.game.click) {
                const { x, y, w, h } = this.combatButtonRect;
                const mouse = this.game.click;
                if (mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h) {
                    this.combatStarted = true;
                    this.showCombatButton = false;
                }
            }
        } else {
            // Combat phase: alternate player/enemy turns, BFS move/attack
            this.combatTimer += this.game.clockTick || 0.016;
            if (this.combatTimer >= this.combatDelay) {
                this.combatTimer = 0;
                // Player units act
                const aliveEnemies = this.enemies.filter(e => e.alive && e.block);
                const alivePlayers = this.units.filter(u => u.alive && u.block);
                if (aliveEnemies.length === 0 || alivePlayers.length === 0) {
                    this.combatStarted = false; // End combat if one side is wiped out
                    return;
                }
                for (const unit of alivePlayers) {
                    // Find closest enemy (not on same team)
                    const adjacent = aliveEnemies.find(e =>
                        e.block && unit.block &&
                        Math.abs(unit.block.mapX - e.block.mapX) + Math.abs(unit.block.mapY - e.block.mapY) === 1
                    );
                    if (adjacent) {
                        // Attack
                        adjacent.hp -= unit.attack || 1;
                        if (adjacent.hp <= 0) {
                            adjacent.alive = false;
                            adjacent.block.unit = null;
                            adjacent.block = null;
                        }
                    } else {
                        // Move towards closest enemy
                        const targetBlocks = aliveEnemies.filter(e => e.block).map(e => e.block);
                        const nextBlock = bfs(unit.block, targetBlocks, this.blocks);
                        if (nextBlock && !nextBlock.unit) {
                            unit.block.unit = null;
                            unit.setBlock(nextBlock);
                        }
                    }
                }
                // Enemy units act
                for (const enemy of aliveEnemies) {
                    // Find closest player unit (not on same team)
                    const adjacent = alivePlayers.find(u =>
                        u.block && enemy.block &&
                        Math.abs(enemy.block.mapX - u.block.mapX) + Math.abs(enemy.block.mapY - u.block.mapY) === 1
                    );
                    if (adjacent) {
                        // Attack
                        adjacent.hp -= 1;
                        if (adjacent.hp <= 0) {
                            adjacent.alive = false;
                            adjacent.block.unit = null;
                            adjacent.block = null;
                        }
                    } else {
                        // Move towards closest player unit
                        const targetBlocks = alivePlayers.filter(u => u.block).map(u => u.block);
                        const nextBlock = bfs(enemy.block, targetBlocks, this.blocks);
                        if (nextBlock && !nextBlock.unit) {
                            enemy.block.unit = null;
                            enemy.block = nextBlock;
                            nextBlock.unit = enemy;
                        }
                    }
                }
            }
        }
    }

    draw(ctx) {
        // Draw grid
        this.blocks.forEach(row => {
            row.forEach(block => {
                block.draw(ctx);
            });
        });
        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(ctx));
        // Draw units
        this.units.forEach(unit => unit.draw(ctx));
        // Draw unit area
        if (!this.combatStarted) {
            ctx.save();
            ctx.strokeStyle = "#888";
            ctx.lineWidth = 2;
            ctx.strokeRect(this.unitArea.x, this.unitArea.y, this.unitArea.w, this.unitArea.h);
            ctx.font = "16px Arial";
            ctx.fillStyle = "#fff";
            ctx.fillText("Drag units from here", this.unitArea.x + 10, this.unitArea.y + 20);
            ctx.restore();
        }
        // Draw level name
        ctx.save();
        ctx.font = "32px Arial";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(this.levelName, 512, 50);
        ctx.textAlign = "start";
        ctx.restore();

        // Draw combat button if ready
        if (this.showCombatButton) {
            const { x, y, w, h } = this.combatButtonRect;
            ctx.save();
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = "#222";
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);
            ctx.font = "28px Arial";
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.fillText("Start Combat", x + w / 2, y + h / 2 + 10);
            ctx.textAlign = "start";
            ctx.restore();
        }
    }
}
