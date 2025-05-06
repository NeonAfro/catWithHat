const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
];
class CombatEntity {
    //constructor(entity, block, spaceHeightAdjusted, size, blockX, blockY, allBlocks, frameRate, game) {
    //block.unit = new CombatEntity(this.enemies[i], this, block);
    constructor(raw, battle, block) {
        this.battle = battle;
        this.block = block;
        this.granny = raw.granny;
        this.raw = raw;
        this.entity = raw;
        this.spaceHeightAdjusted = PARAMS.spaceHeightAdjusted; 
        this.size = ENTITY_SIZE;
        this.blockX = block.mapX; 
        this.blockY = block.mapY; 
        this.allBlocks = battle.allBlocks; 
        this.game = battle.game; 

        this.z = this.block.z + 1;
        this.x = this.block.x + this.block.width * this.block.scale / 2;
        this.dx = 0;
        this.y = this.block.y + this.spaceHeightAdjusted * this.block.scale / 2;
        this.dy = 0;
        this.frames = ASSET_MANAGER.getAsset(this.entity.asset).width / 32;
        this.currentFrame = 0;
        this.ticker = 0;
        this.attacking = false;
        this.ready = false;
        this.assetSize = ASSET_MANAGER.getAsset(this.entity.asset).height;
        this.attackElapsed = 0;
        this.moveElapsed = 0;
        this.drawTime = 0;
      //atk speed for frequency of attack rate
      //move speed for frequency of moving
    }
    bfsAttack(){
        const queue = [];
        const visited = new Set();
        queue.push({x: this.block.mapX, y: this.block.mapY, dist: 0});
        let target = null;
        while(queue.length) {
            const current = queue.shift();
            const currBlock = this.allBlocks[current.y][current.x];
            if(current.dist > this.raw.attackRange) continue;
            if(currBlock.unit?.raw.hp > 0 &&
                currBlock.unit.granny != this.granny) { // not start case.
                target = currBlock.unit; break;
            } 
            for (const d of directions) {
                const nx = current.x + d.dx;
                const ny = current.y + d.dy;
                if (nx < 0 || nx >= 7 || ny < 0 || ny >= 7) continue;
                const key = `${nx},${ny}`;
                if(visited.has(key)) continue;
                visited.add(key);
                queue.push({
                    x: nx,
                    y: ny,
                    dist: current.dist + 1 // check if current.initial exists.
                });
            }
        }
        return target;
    }
    bfsMove() { // return the dx, dy to move. also return the x and y of closest enemy.
        // find enemy, check if spot is available, find closest spot.
        const queue = [];
        const visited = new Set();
        queue.push ({x: this.block.mapX, y: this.block.mapY, dist: 0}) // just find the nearest enemy, then move using the initial direction.
        while(queue.length) { //this'll stop, and when it does, we just return null;
            const current = queue.shift();
            const currBlock = this.allBlocks[current.y][current.x];

            if(currBlock.unit?.granny !== this.raw.granny &&
                currBlock.unit?.raw.hp > 0) {
                return current;
            }
            for (const d of directions) {
                const nx = current.x + d.dx;
                const ny = current.y + d.dy;
                if (nx < 0 || nx >= 7 || ny < 0 || ny >= 7) continue;
                const key = `${nx},${ny}`;
                if(visited.has(key)) continue;
                visited.add(key);
                const nextBlock = this.allBlocks[ny][nx];
                if (nextBlock.unit && nextBlock.unit.raw.granny === this.raw.granny) {
                    continue;
                }
                queue.push({
                    x: nx,
                    y: ny,
                    dist: current.dist + 1,
                    initial: (current.initial ? current.initial : {x: d.dx, y: d.dy}) // check if current.initial exists.
                });
            }
        }
        return null;
    }
    bfsClosest(){ // only triggers when bfsMove fails

    }
    attack() {
        this.attackElapsed += this.game.clockTick;
        if(this.attackElapsed >= this.raw.attackSpeed) { 
            // add special move here
            if(this.raw.item?.attack && typeof this.raw.item.attack === `function`) {
                this.raw.item.attack(this);
            } else {
                const damage = Math.round((this.target.raw.defense ? 
                    1 - (this.target.raw.defense / (this.target.raw.defense + 50))
                    : 1) * this.raw.attack);
                this.target.raw.hp -= damage;
    
                // determining damageNum and beam placement.
                const origX  = this.block.isoX + this.block.width * 0.5;
                const origY  = this.block.isoY - this.block.height * 0.2;
                const destX  = this.target.block.isoX + this.target.block.width * 0.5;
                const destY  = this.target.block.isoY + this.target.block.height * 0.2;
                // damage number gen
                this.game.addEntity(new DamageNum(this.game, destX, destY, damage, this.raw.granny));
    
                // if ranged, shoot beam
                if (this.raw.attackRange > 1) {
                    this.game.addEntity(new Beam(this.game, {x: origX, y: origY}, {x: destX, y: destY}, damage));
                }
            }

            // temporary code - will replace with sounds unique to each combat entity
            // DEBUG
            if (Math.random() < 0.5) {
                PLAY.hit1();
            } else {
                PLAY.hit2();
            }
            this.attackElapsed = 0;
            this.attacking = true;
        }
    }
    update() {
        this.dx = 0;
        this.dy = 0;
        if(!this.ready) return;
        if(this.raw.hp <= 0) {
            PLAY.death();
            // TODO: make a better exp thingy -> L.C.
            // adorNum is distracting.
            // if(!this.granny) this.game.addEntity(new AdorNum(this.game, this.block.isoX, this.block.isoY, this.raw.exp));
            this.battle.sceneManager.party.exp += this.raw.exp ? this.raw.exp :0;
            this.block.unit = null;
            this.removeFromWorld = true;
        }
        if (this.prevBlock || !this.attacking) this.moveElapsed += this.game.clockTick;

        // first, check if target is alive and their
        // target should be the unit on the block.
        if(this.target && this.target.raw.hp > 0 && 
            (Math.abs(this.blockX - this.target.blockX) + 
            Math.abs(this.blockY - this.target.blockY) <= this.raw.attackRange)) {
                this.attack();
        } else { // attempt to find another enemy in vacinity
            // initial.x & initial.y to move, & x,y of closestEnemy, dist of enemy
            this.attacking = false;
            let foundAttack = null;
            if(this.raw.item?.bfsAttack && typeof this.raw.item.bfsAttack === `function`) {
                foundAttack = this.raw.item.bfsAttack(this);
            } else {
                foundAttack = this.bfsAttack(); // enemies close enough for attack
            }
            
            if(foundAttack) {
                this.target = foundAttack;
                this.attack();
                // do an else if for bfsClosest.
            } else { // foundAttack should return the enemy we can hit.
                const foundMove = this.bfsMove();
                if(foundMove){
                    if(this.moveElapsed >= this.raw.moveSpeed){
                        const block = this.allBlocks[this.block.mapY + foundMove.initial.y]
                        [this.block.mapX + foundMove.initial.x];

                        this.prevBlock = this.block;
                        this.blockMove(block);
                        this.moveElapsed = 0;// how timer is used
                    }
                    this.attacking = false;
                }
            }

        }
        if (this.prevBlock) {
            // calculate movement interpolation
            //const prog = Math.sqrt(this.elapsedTime) / Math.sqrt(this.raw.moveSpeed);
            const prog = Math.pow(this.raw.moveSpeed - this.moveElapsed, 2) / Math.pow(this.raw.moveSpeed, 2);
            const mapX = this.block.mapX - this.prevBlock.mapX;
            const mapY = this.block.mapY - this.prevBlock.mapY;
            //const mapX = found.initial.x;
            //const mapY = found.initial.y;
            const isoX = (mapY - mapX) * PARAMS.spaceWidth * PARAMS.scale / 2;
            const isoY = (mapY + mapX) * PARAMS.spaceHeight * PARAMS.scale / 3;
            this.dx = -isoX * prog;
            this.dy = -isoY * prog;
            this.z = Math.max(this.z, this.prevBlock.z + 1)

            if (this.moveElapsed >= this.raw.moveSpeed) {
                this.prevBlock = undefined;
                this.dx = 0;
                this.dy = 0;
            }
        }
    }
  
    draw(ctx) {
        this.drawTime += this.game.clockTick;
        if(this.drawTime >= this.entity.attackSpeed && this.attacking){
            if(this.currentFrame >= this.frames -1) this.currentFrame = 0;
            else this.currentFrame++;
            this.drawTime = 0 ;
        }

        // draw the hp?
        const img = ASSET_MANAGER.getAsset(
            (this.entity.granny ? "./assets/battleScene/allyHp.png" :
                "./assets/battleScene/enemyHealth.png"
            ));
        // const adjustedX =
        const hpY = this.size / 4;
        // draw blackHp first
        ctx.drawImage( // magic numbers are hard defined just for hp.
            img,
            1 + 32,
            5,
            30,
            26,
            this.block.isoX + this.block.width /2
                + (this.raw.granny ? -1 : 1/2 ) * this.size * this.block.scale / 2
                + this.dx,
            (this.block.isoY + this.spaceHeightAdjusted * this.block.scale / 2
                - this.size * this.block.scale) - hpY * 2
                + this.dy,
            this.size / 4 * this.block.scale,
            this.size / 4 * this.block.scale * (26/30) // raw ratio
        );
        // draw realHp
        const currHpBar = this.raw.hp / this.raw.maxHp;
        const pHeight = 5 + currHpBar * 26;

        ctx.drawImage(
            img,
            1,
            (this.raw.granny ? 5 + ((1 - currHpBar) * 26) : pHeight ),
            30,
            26 * (this.raw.granny ? currHpBar : 1 - currHpBar),

            this.block.isoX + this.block.width / 2
                + (this.raw.granny ? -1 : 1/2 ) * this.size * this.block.scale / 2
                + this.dx,

            (this.block.isoY + this.spaceHeightAdjusted * this.block.scale / 2
                - this.size * this.block.scale) - hpY * 2 + 
                (this.raw.granny ? 
                    (1-currHpBar) : currHpBar)
                * (26/30) * this.size / 4 * this.block.scale
                + this.dy,

            this.size / 4 * this.block.scale,

            (this.size / 4 * this.block.scale * (26/30) * 
                (this.raw.granny ? currHpBar : (1 - currHpBar))) // raw ratio
        );

        // actual unit drawing
        ctx.drawImage(
            ASSET_MANAGER.getAsset(this.raw.asset),
            this.currentFrame * this.assetSize,
            0,
            this.assetSize,
            this.assetSize,
            this.block.isoX + this.block.width / 2
                - this.size * this.block.scale / 2
                + this.dx,
            (this.block.isoY + this.spaceHeightAdjusted * this.block.scale / 2
                - this.size * this.block.scale)
                + this.dy,
            this.size * this.block.scale,
            this.size * this.block.scale
        );
    }
    blockMove(newBlock){
        if(!newBlock.unit){
            this.block.unit = null;
            this.block.selected = false;
            this.z = newBlock.z + 1;
            this.block = newBlock;
            this.block.unit = this;
            this.blockX = this.block.mapX;
            this.blockY = this.block.mapY;
        }
    }
}
