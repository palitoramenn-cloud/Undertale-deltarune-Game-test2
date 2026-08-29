const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const progressValue = document.getElementById("progressValue");
const levelValue = document.getElementById("levelValue");
const scoreValue = document.getElementById("scoreValue");
 
const touchControls = document.getElementById("touchControls");
const touchStick = document.getElementById("touchStick");

const WORLD = {
    width: 2200,
    height: 1800,
    tileSize: 80,
};

const camera = {
    x: 0,
    y: 0,
};

const input = {
    up: false,
    down: false,
    left: false,
    right: false,
};

const touchInput = {
    up: false,
    down: false,
    left: false,
    right: false,
};

const touchState = {
    active: false,
    pointerId: null,
    radius: 42,
};

const player = {
    x: WORLD.width / 2,
    y: WORLD.height / 2,
    radius: 22,
    speed: 260,
    progress: 0,
    level: 1,
    maxProgress: 100,
};

const collectibles = [];
const aiPlayers = [];

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function createAiPlayer() {
    const radius = 18 + Math.random() * 6;
    const speed = 100 + Math.random() * 45;
    const x = 120 + Math.random() * (WORLD.width - 240);
    const y = 120 + Math.random() * (WORLD.height - 240);

    return {
        x,
        y,
        radius,
        speed,
        directionX: (Math.random() * 2 - 1),
        directionY: (Math.random() * 2 - 1),
        wanderTimer: 0.8 + Math.random() * 1.8,
        directionChangeTimer: 0.6 + Math.random() * 1.5,
        color: `hsl(${Math.random() * 40 + 200}, 80%, 62%)`,
        progress: 0,
        level: 1,
        maxProgress: 100,
    };
}

function spawnAiPlayers() {
    aiPlayers.length = 0;
    aiPlayers.push(createAiPlayer());
}

function updateAiPlayers(dt) {
    for (const ai of aiPlayers) {
        let targetItem = null;
        let bestDistance = Infinity;

        for (const item of collectibles) {
            const dx = item.x - ai.x;
            const dy = item.y - ai.y;
            const distance = Math.hypot(dx, dy);

            if (distance < 260 && distance < bestDistance) {
                targetItem = item;
                bestDistance = distance;
            }
        }

        ai.directionChangeTimer -= dt;

        if (targetItem) {
            const dx = targetItem.x - ai.x;
            const dy = targetItem.y - ai.y;
            const distance = Math.hypot(dx, dy) || 1;
            ai.directionX = dx / distance;
            ai.directionY = dy / distance;
        } else {
            ai.wanderTimer -= dt;

            if (ai.directionChangeTimer <= 0 || ai.wanderTimer <= 0) {
                ai.directionX = (Math.random() * 2 - 1) * 0.9;
                ai.directionY = (Math.random() * 2 - 1) * 0.9;
                ai.directionChangeTimer = 0.6 + Math.random() * 1.7;
                ai.wanderTimer = 0.8 + Math.random() * 1.9;
            }
        }

        const length = Math.hypot(ai.directionX, ai.directionY) || 1;
        const moveX = (ai.directionX / length) * ai.speed * dt;
        const moveY = (ai.directionY / length) * ai.speed * dt;

        ai.x += moveX;
        ai.y += moveY;

        if (ai.x < ai.radius || ai.x > WORLD.width - ai.radius) {
            ai.directionX *= -1;
            ai.x = clamp(ai.x, ai.radius, WORLD.width - ai.radius);
        }

        if (ai.y < ai.radius || ai.y > WORLD.height - ai.radius) {
            ai.directionY *= -1;
            ai.y = clamp(ai.y, ai.radius, WORLD.height - ai.radius);
        }

        for (let i = collectibles.length - 1; i >= 0; i -= 1) {
            const item = collectibles[i];
            const dx = ai.x - item.x;
            const dy = ai.y - item.y;
            const distance = Math.hypot(dx, dy);

            if (distance <= ai.radius + item.radius) {
                ai.progress += item.value;
                collectibles.splice(i, 1);
            }
        }

        const nextLevel = Math.floor(ai.progress / ai.maxProgress) + 1;
        if (nextLevel !== ai.level) {
            ai.level = nextLevel;
        }
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function spawnCollectibles() {
    const amount = 26;

    for (let i = 0; i < amount; i += 1) {
        collectibles.push({
            x: 100 + Math.random() * (WORLD.width - 200),
            y: 100 + Math.random() * (WORLD.height - 200),
            radius: 10 + Math.random() * 10,
            value: 8 + Math.random() * 14,
            hue: 150 + Math.random() * 60,
        });
    }
}

function resetTouchInput() {
    touchInput.up = false;
    touchInput.down = false;
    touchInput.left = false;
    touchInput.right = false;
    touchStick.style.transform = "translate(0px, 0px)";
}

function updateTouchControl(clientX, clientY) {
    const rect = touchControls.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxDistance = Math.min(rect.width, rect.height) * 0.34;
    const distance = Math.hypot(dx, dy);
    const safeDistance = distance > maxDistance ? maxDistance / distance : 1;
    const limitedX = dx * safeDistance;
    const limitedY = dy * safeDistance;

    const offsetX = limitedX;
    const offsetY = limitedY;

    touchStick.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

    const inputX = Math.abs(offsetX) > 8 ? offsetX / maxDistance : 0;
    const inputY = Math.abs(offsetY) > 8 ? offsetY / maxDistance : 0;

    touchInput.up = inputY < -0.2;
    touchInput.down = inputY > 0.2;
    touchInput.left = inputX < -0.2;
    touchInput.right = inputX > 0.2;
}

function attachTouchControls() {
    const stopTouch = (event) => {
        if (touchState.active && touchState.pointerId === event.pointerId) {
            touchState.active = false;
            touchState.pointerId = null;
            resetTouchInput();
        }
    };

    touchControls.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        touchState.active = true;
        touchState.pointerId = event.pointerId;
        touchControls.setPointerCapture(event.pointerId);
        updateTouchControl(event.clientX, event.clientY);
    });

    touchControls.addEventListener("pointermove", (event) => {
        if (!touchState.active || touchState.pointerId !== event.pointerId) {
            return;
        }

        updateTouchControl(event.clientX, event.clientY);
    });

    touchControls.addEventListener("pointerup", stopTouch);
    touchControls.addEventListener("pointercancel", stopTouch);
    touchControls.addEventListener("pointerleave", (event) => {
        if (!touchState.active || touchState.pointerId !== event.pointerId) {
            return;
        }

        stopTouch(event);
    });
}

function updatePlayer(dt) {
    const moveX = ((input.right || touchInput.right) ? 1 : 0) - ((input.left || touchInput.left) ? 1 : 0);
    const moveY = ((input.down || touchInput.down) ? 1 : 0) - ((input.up || touchInput.up) ? 1 : 0);

    let length = Math.hypot(moveX, moveY);
    if (length > 0) {
        length = 1 / length;
    }

    const moveXNormalized = moveX * length;
    const moveYNormalized = moveY * length;

    player.x += moveXNormalized * player.speed * dt;
    player.y += moveYNormalized * player.speed * dt;

    player.x = clamp(player.x, player.radius, WORLD.width - player.radius);
    player.y = clamp(player.y, player.radius, WORLD.height - player.radius);
}

function updateCamera() {
    camera.x = clamp(player.x - canvas.width / 2, 0, WORLD.width - canvas.width);
    camera.y = clamp(player.y - canvas.height / 2, 0, WORLD.height - canvas.height);
}

function collectProgress() {
    for (let i = collectibles.length - 1; i >= 0; i -= 1) {
        const item = collectibles[i];
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const distance = Math.hypot(dx, dy);

        if (distance <= player.radius + item.radius) {
            player.progress += item.value;
            collectibles.splice(i, 1);
        }
    }

    const nextLevel = Math.floor(player.progress / player.maxProgress) + 1;
    if (nextLevel !== player.level) {
        player.level = nextLevel;
    }
}

function updateHud() {
    const currentLevelProgress = player.progress % player.maxProgress;
    progressValue.textContent = `${Math.floor(currentLevelProgress)} / ${player.maxProgress}`;
    levelValue.textContent = String(player.level);
    scoreValue.textContent = String(Math.floor(player.progress));
}

function drawWorld() {
    ctx.fillStyle = "#152238";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    ctx.fillStyle = "#1d3557";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // Grid del mapa para visualizar el espacio jugable.
    ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD.width; x += WORLD.tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD.height);
        ctx.stroke();
    }
    for (let y = 0; y <= WORLD.height; y += WORLD.tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD.width, y);
        ctx.stroke();
    }

    for (const item of collectibles) {
        ctx.beginPath();
        ctx.fillStyle = `hsla(${item.hue}, 80%, 60%, 1)`;
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    for (const ai of aiPlayers) {
        ctx.beginPath();
        ctx.fillStyle = ai.color;
        ctx.arc(ai.x, ai.y, ai.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.arc(ai.x, ai.y, ai.radius + 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#e5e7eb";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(String(ai.level), ai.x, ai.y - ai.radius - 12);
    }

    ctx.beginPath();
    ctx.fillStyle = "#34d399";
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - (gameLoop.lastTime || timestamp)) / 1000, 0.033);
    gameLoop.lastTime = timestamp;

    updatePlayer(dt);
    updateAiPlayers(dt);
    collectProgress();
    updateCamera();
    updateHud();
    drawWorld();

    requestAnimationFrame(gameLoop);
}

function attachInput() {
    window.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();
        if (key === "w" || key === "arrowup") input.up = true;
        if (key === "s" || key === "arrowdown") input.down = true;
        if (key === "a" || key === "arrowleft") input.left = true;
        if (key === "d" || key === "arrowright") input.right = true;
    });

    window.addEventListener("keyup", (event) => {
        const key = event.key.toLowerCase();
        if (key === "w" || key === "arrowup") input.up = false;
        if (key === "s" || key === "arrowdown") input.down = false;
        if (key === "a" || key === "arrowleft") input.left = false;
        if (key === "d" || key === "arrowright") input.right = false;
    });
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
attachInput();
attachTouchControls();
spawnCollectibles();
spawnAiPlayers();
updateHud();
requestAnimationFrame(gameLoop);