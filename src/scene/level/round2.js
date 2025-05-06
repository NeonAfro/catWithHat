import { Block } from "../../scene/stage.js";
import { Round3 } from "./round3.js";

const ENEMY_IMG_PATH = "./src/img/Melanie_Martinez.png";
const UNIT_IMG_PATH = "./src/img/dapperBird.png";

class Enemy {
    constructor(img, block, allBlocks) {
        this.img = img;
        this.block = block;
        this.size = 64;
        this.z = block.z + 20;
        this.hp = 3;
        this.allBlocks = allBlocks;
        this.alive = true;
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

class PlayerUnit {
    constructor(img, block, level) {
        this.img = img;
        this.block = block;
        this.level = level;
        this.size = 64; // Bigger size for hero
        this.dragging = false;
        this.z = block ? block.z + 30 : 10000;
        this.hp = 8; // Stronger hero
        this.attack = 2; // Stronger attack
        this.allBlocks = null;
        this.alive = true;
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

function bfs(startBlock, targetBlocks, allBlocks) {
    // Returns the next block towards the closest target block, or null if unreachable
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

export class Round2 {
    constructor(game, assetManager) {
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
        this.levelName = "Round 2";
        this.combatStarted = false;
        this.showCombatButton = false;
        this.combatButtonRect = { x: 420, y: 350, w: 180, h: 60 };
        this.combatTimer = 0;
        this.combatDelay = 0.7;
        this.recruitMode = false;
        this.defeatedEnemies = [];
        this.selectedRecruit = null;
        this.confirmButtonRect = { x: 412, y: 500, w: 200, h: 60 };
        this.showNextButton = false;
        this.nextButtonRect = { x: 420, y: 350, w: 180, h: 60 };
        this.init();
    }

    init() {
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

        // Place one draggable dapperBird (not on grid yet)
        const unitImg = this.assetManager.getAsset(UNIT_IMG_PATH);
        this.units = [];
        this.units.push(new PlayerUnit(unitImg, null, this));
    }

    update() {
        // Placement phase
        if (!this.combatStarted && !this.recruitMode) {
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
            // Show combat button if both units are placed
            this.showCombatButton = this.units.every(u => u.block);
            // Handle combat button click
            if (this.showCombatButton && this.game.click) {
                const { x, y, w, h } = this.combatButtonRect;
                const mouse = this.game.click;
                if (mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h) {
                    this.combatStarted = true;
                    this.showCombatButton = false;
                }
            }
        } else if (this.combatStarted) {
            // Combat phase: alternate player/enemy turns, BFS move/attack
            this.combatTimer += this.game.clockTick || 0.016;
            if (this.combatTimer >= this.combatDelay) {
                this.combatTimer = 0;
                // Player units act
                for (const unit of this.units) {
                    if (!unit.alive || !unit.block) continue;
                    // Find closest enemy
                    const aliveEnemies = this.enemies.filter(e => e.alive && e.block);
                    if (aliveEnemies.length === 0) continue;
                    const adjacent = aliveEnemies.find(e =>
                        Math.abs(unit.block.mapX - e.block.mapX) + Math.abs(unit.block.mapY - e.block.mapY) === 1
                    );
                    if (adjacent) {
                        // Attack
                        adjacent.hp -= unit.attack || 2; // Use hero's attack
                        if (adjacent.hp <= 0) {
                            adjacent.alive = false;
                            adjacent.block.unit = null;
                            adjacent.block = null;
                        }
                    } else {
                        // Move towards closest enemy
                        const targetBlocks = aliveEnemies.map(e => e.block);
                        const nextBlock = bfs(unit.block, targetBlocks, this.blocks);
                        if (nextBlock && !nextBlock.unit) {
                            unit.block.unit = null;
                            unit.setBlock(nextBlock);
                        }
                    }
                }
                // Enemy units act
                for (const enemy of this.enemies) {
                    if (!enemy.alive || !enemy.block) continue;
                    // Find closest player unit
                    const aliveUnits = this.units.filter(u => u.alive && u.block);
                    if (aliveUnits.length === 0) continue;
                    const adjacent = aliveUnits.find(u =>
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
                        const targetBlocks = aliveUnits.map(u => u.block);
                        const nextBlock = bfs(enemy.block, targetBlocks, this.blocks);
                        if (nextBlock && !nextBlock.unit) {
                            enemy.block.unit = null;
                            enemy.block = nextBlock;
                            nextBlock.unit = enemy;
                        }
                    }
                }
            }
            // After combat, check for victory
            const aliveEnemies = this.enemies.filter(e => e.alive && e.block);
            if (aliveEnemies.length === 0 && !this.recruitMode) {
                // Collect defeated enemies for recruit screen
                this.defeatedEnemies = this.enemies.filter(e => !e.alive);
                this.recruitMode = true;
                this.combatStarted = false;
            }
        } else if (this.recruitMode) {
            // Handle recruit selection
            if (this.game.click && this.defeatedEnemies.length > 0) {
                // Select recruit
                for (let i = 0; i < this.defeatedEnemies.length; i++) {
                    const x = 200 + i * 200;
                    const y = 300;
                    const w = 128, h = 128;
                    const mouse = this.game.click;
                    if (mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h) {
                        this.selectedRecruit = this.defeatedEnemies[i];
                    }
                }
                // Confirm button
                const { x, y, w, h } = this.confirmButtonRect;
                const mouse = this.game.click;
                if (
                    this.selectedRecruit &&
                    mouse.x >= x && mouse.x <= x + w &&
                    mouse.y >= y && mouse.y <= y + h
                ) {
                    // Add recruit to lineup for next stage (placeholder)
                    // For now, just highlight and keep on screen
                    this.selectedRecruit.recruited = true;
                    this.recruitMode = false;
                    this.showNextButton = true;
                }
            }
        } else if (this.showNextButton && this.game.click) {
            const { x, y, w, h } = this.nextButtonRect;
            const mouse = this.game.click;
            if (mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h) {
                this.removeFromWorld = true;
                // Pass lineup to next level
                const lineup = [this.units[0]];
                if (this.selectedRecruit) lineup.push(this.selectedRecruit);
                this.game.addEntity(new Round3(this.game, this.assetManager, lineup));
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

        // Draw unit count
        ctx.save();
        ctx.font = "20px Arial";
        ctx.fillStyle = "#fff";
        // Show correct count depending on recruit selection
        let count = this.units.filter(u => u.block).length;
        if (this.recruitMode && this.selectedRecruit) count += 1;
        ctx.fillText(`Units: ${count}/1${this.recruitMode ? "+1" : ""}`, 20, 140);
        ctx.restore();

        // Draw recruit screen if in recruitMode
        if (this.recruitMode) {
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = "#222";
            ctx.fillRect(0, 0, 1024, 768);
            ctx.globalAlpha = 1;
            ctx.font = "32px Arial";
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.fillText("Pick a defeated enemy to recruit!", 512, 120);
            ctx.textAlign = "start";
            // Draw defeated enemies to pick
            for (let i = 0; i < this.defeatedEnemies.length; i++) {
                const enemy = this.defeatedEnemies[i];
                const x = 200 + i * 200;
                const y = 300;
                ctx.save();
                ctx.globalAlpha = this.selectedRecruit === enemy ? 1 : 0.7;
                ctx.drawImage(enemy.img, x, y, 128, 128);
                ctx.restore();
                if (this.selectedRecruit === enemy) {
                    ctx.save();
                    ctx.strokeStyle = "#FFD700";
                    ctx.lineWidth = 6;
                    ctx.strokeRect(x, y, 128, 128);
                    ctx.restore();
                }
            }
            // Draw confirmation button
            ctx.save();
            const { x, y, w, h } = this.confirmButtonRect;
            ctx.globalAlpha = this.selectedRecruit ? 1 : 0.5;
            ctx.fillStyle = "#444";
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);
            ctx.font = "28px Arial";
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.fillText("Confirm", x + w / 2, y + h / 2 + 10);
            ctx.textAlign = "start";
            ctx.restore();

            // Draw current lineup (hero + recruit if selected)
            ctx.save();
            ctx.font = "24px Arial";
            ctx.fillStyle = "#fff";
            ctx.fillText("Your Lineup:", 60, 700);
            // Hero
            ctx.drawImage(this.units[0].img, 60, 720, 64, 64);
            ctx.font = "18px Arial";
            ctx.fillText("Hero", 60, 790);
            // Recruited enemy (if selected)
            if (this.selectedRecruit) {
                ctx.drawImage(this.selectedRecruit.img, 140, 720, 64, 64);
                ctx.font = "18px Arial";
                ctx.fillText("Recruited", 140, 790);
            }
            ctx.restore();

            ctx.restore();
            return;
        }
        // Draw next level button if ready
        if (this.showNextButton) {
            const { x, y, w, h } = this.nextButtonRect;
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
            ctx.fillText("Next Level", x + w / 2, y + h / 2 + 10);
            ctx.textAlign = "start";
            ctx.restore();
        }
    }
}
