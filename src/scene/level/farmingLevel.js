import { Block } from "../../scene/stage.js";

const UNIT_IMG_PATH = "./src/img/dapperBird.png";

class Placeholder {
    constructor(block, color, resourceType, farmingLevel, radius = 32) {
        this.block = block;
        this.color = color;
        this.radius = radius;
        this.resourceType = resourceType;
        this.farmingLevel = farmingLevel;
        this.z = block.z + 10;
    }
    update() {}
    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(
            this.block.x + 64,
            this.block.y + 48,
            this.radius,
            0, 2 * Math.PI
        );
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.restore();
    }
}

class FarmingUnit {
    constructor(img, block, farmingLevel) {
        this.img = img;
        this.block = block;
        this.farmingLevel = farmingLevel;
        this.size = 40;
        this.dragging = false;
        this.offset = { x: 0, y: 0 };
        this.collectedThisTurn = false;
        this.z = block ? block.z + 20 : 10000;
    }
    setBlock(block) {
        if (this.block) this.block.unit = null;
        this.block = block;
        if (block) block.unit = this;
        this.z = block ? block.z + 20 : 10000;
    }
    isClicked(mouse, index = 0) {
        if (!mouse) return false;
        // Only clickable if not placed on the grid and not being dragged
        if (this.block || this.dragging) return false;
        // Use the same position as the drawn sprite in the unit area
        const cx = this.farmingLevel.unitArea.x + 40 + index * 80 + this.size / 2;
        const cy = this.farmingLevel.unitArea.y + 40 + this.size / 2;
        const dx = mouse.x - cx;
        const dy = mouse.y - cy;
        return dx * dx + dy * dy <= this.size * this.size;
    }
    draw(ctx, index = 0) {
        let x, y;
        if (this.dragging) {
            x = this.farmingLevel.game.mouse.x - this.size / 2;
            y = this.farmingLevel.game.mouse.y - this.size / 2;
        } else if (this.block) {
            x = this.block.x + 64 - this.size / 2;
            y = this.block.y + 48 - this.size / 2;
        } else {
            // In unit area
            x = this.farmingLevel.unitArea.x + 40 + index * 80;
            y = this.farmingLevel.unitArea.y + 40;
        }
        ctx.save();
        ctx.drawImage(this.img, x, y, this.size, this.size);
        ctx.restore();
        if (this.dragging) {
            ctx.save();
            ctx.strokeStyle = "#FFD700";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, this.size, this.size);
            ctx.restore();
        }
    }
}

export class FarmingLevel {
    constructor(game, assetManager) {
        this.game = game;
        this.assetManager = assetManager;
        this.gridWidth = 7;
        this.gridHeight = 7;
        this.tileWidth = 128;
        this.tileHeight = 96;
        this.scale = 2;
        this.blocks = [];
        this.placeholders = [];
        this.resources = { wood: 0, stone: 0, berries: 0 };
        this.units = [];
        this.selectedUnit = null;
        this.turn = 5; // Number of turns to play out after button press
        this.turnsActive = false; // Whether auto-turns are running
        this.turnDelay = 0.7; // seconds between turns
        this.turnTimer = 0;
        this.unitArea = { x: 350, y: 650, w: 350, h: 100 };
        this.showNextButton = false;
        this.nextButtonRect = { x: 420, y: 350, w: 180, h: 60 };
        this.levelName = "Round 1";
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

        // Centered, equilateral triangle
        const cx = Math.floor(this.gridWidth / 2);
        const cy = Math.floor(this.gridHeight / 2);

        // Top vertex (centered)
        this.placeholders.push(
            new Placeholder(this.blocks[cy - 1][cx], "rgba(200,100,50,0.8)", "wood", this)
        );
        // Bottom left vertex
        this.placeholders.push(
            new Placeholder(this.blocks[cy + 1][cx - 1], "rgba(100,200,50,0.8)", "stone", this)
        );
        // Bottom right vertex
        this.placeholders.push(
            new Placeholder(this.blocks[cy + 1][cx + 1], "rgba(50,100,200,0.8)", "berries", this)
        );

        // Unit area (bottom of screen)
        const unitImg = this.assetManager.getAsset(UNIT_IMG_PATH);
        for (let i = 0; i < 3; i++) {
            const unit = new FarmingUnit(unitImg, null, this);
            this.units.push(unit);
        }
    }

    update() {
        // Start turn sequence on SPACE
        if (!this.turnsActive && this.turn > 0 && this.game.keys && this.game.keys[" "]) {
            this.turnsActive = true;
            this.turnTimer = 0;
            this.game.keys[" "] = false;
        }

        // Play out turns with delay
        if (this.turnsActive && this.turn > 0) {
            this.turnTimer += this.game.clockTick || 0.016;
            if (this.turnTimer >= this.turnDelay) {
                this.playTurn();
                this.turn--;
                this.turnTimer = 0;
                if (this.turn === 0) {
                    this.turnsActive = false;
                    this.showNextButton = true;
                }
            }
        }

        // Handle next level button click
        if (this.showNextButton && this.game.click) {
            const { x, y, w, h } = this.nextButtonRect;
            const mouse = this.game.click;
            if (mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h) {
                // Placeholder: go to next level (no-op for now)
                // Optionally: this.game.addEntity(new NextLevel(...));
                // Remove this level entity if needed
                // this.removeFromWorld = true;
            }
        }

        // Drag and drop logic (only allow before turns start)
        if (!this.turnsActive && !this.showNextButton && this.game.click) {
            // If a unit is being dragged, try to drop it
            if (this.selectedUnit && this.selectedUnit.dragging) {
                const mouse = this.game.click;
                let dropped = false;
                // Try to drop on a valid block (adjacent to a placeholder)
                for (const ph of this.placeholders) {
                    for (const [dx, dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
                        const bx = ph.block.mapX + dx;
                        const by = ph.block.mapY + dy;
                        if (
                            bx >= 0 && bx < this.gridWidth &&
                            by >= 0 && by < this.gridHeight
                        ) {
                            const block = this.blocks[by][bx];
                            // Check if mouse is over this block and block is empty
                            const cx = block.x + 64;
                            const cy = block.y + 48;
                            const dist = Math.hypot(mouse.x - cx, mouse.y - cy);
                            if (dist < 48 && !block.unit) {
                                this.selectedUnit.setBlock(block);
                                dropped = true;
                                break;
                            }
                        }
                    }
                    if (dropped) break;
                }
                // If not dropped on valid, return to unit area
                if (!dropped) {
                    this.selectedUnit.setBlock(null);
                }
                this.selectedUnit.dragging = false;
                this.selectedUnit = null;
            } else {
                // Build array of visible units in order
                const visibleUnits = this.units.filter(u => !u.block && !u.dragging).slice(0, 3);
                for (let i = 0; i < visibleUnits.length; i++) {
                    if (visibleUnits[i].isClicked(this.game.click, i)) {
                        this.selectedUnit = visibleUnits[i];
                        visibleUnits[i].dragging = true;
                        break;
                    }
                }
            }
        }
    }

    playTurn() {
        // Each unit collects if adjacent to a placeholder and hasn't collected this turn
        for (const unit of this.units) {
            if (unit.block && !unit.collectedThisTurn) {
                for (const ph of this.placeholders) {
                    const dx = Math.abs(unit.block.mapX - ph.block.mapX);
                    const dy = Math.abs(unit.block.mapY - ph.block.mapY);
                    if (dx + dy === 1) {
                        this.resources[ph.resourceType]++;
                        unit.collectedThisTurn = true;
                        break;
                    }
                }
            }
        }
        // Reset collection for next turn
        for (const unit of this.units) {
            unit.collectedThisTurn = false;
        }
    }

    nextTurn() {
        this.turn++;
        for (const unit of this.units) {
            unit.collectedThisTurn = false;
        }
    }

    draw(ctx) {
        // Draw grid
        this.blocks.forEach(row => {
            row.forEach(block => {
                block.draw(ctx);
            });
        });
        // Draw placeholders
        this.placeholders.forEach(ph => ph.draw(ctx));
        // Draw units
        this.units.forEach(unit => unit.draw(ctx));
        // Draw resource counts (top left)
        ctx.save();
        ctx.font = "20px Arial";
        ctx.fillStyle = "#fff";
        ctx.fillText(`Wood: ${this.resources.wood}`, 20, 30);
        ctx.fillText(`Stone: ${this.resources.stone}`, 20, 55);
        ctx.fillText(`Berries: ${this.resources.berries}`, 20, 80);
        ctx.fillText(
            this.turnsActive
                ? `Turns remaining: ${this.turn}`
                : `Press SPACE to play out ${this.turn} turns`,
            20, 110
        );
        ctx.restore();
        // Draw unit area
        ctx.save();
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.unitArea.x, this.unitArea.y, this.unitArea.w, this.unitArea.h);
        ctx.font = "16px Arial";
        ctx.fillStyle = "#fff";
        ctx.fillText("Drag units from here", this.unitArea.x + 10, this.unitArea.y + 20);
        // Draw each unit spaced out horizontally (only 3, left-to-right)
        const visibleUnits = this.units.filter(u => !u.block && !u.dragging).slice(0, 3);
        for (let i = 0; i < visibleUnits.length; i++) {
            visibleUnits[i].draw(ctx, i);
        }
        ctx.restore();

        // Draw level name
        ctx.save();
        ctx.font = "32px Arial";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(this.levelName, 512, 50);
        ctx.textAlign = "start";
        ctx.restore();

        // Draw next level button if turns are over
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
