
// API endpoints are relative, so they work on any domain

// ---- SOUND EFFECTS ----

// Shooting sound
const sndShoot = new Audio("sounds/shoot.mp3");

// When player bullet hits an enemy
const sndEnemyHit = new Audio("sounds/short_boom.mp3");

// When player gets hit by enemy bullet
const sndPlayerHit = new Audio("sounds/player_boom.mp3");

// Background music (loops forever)
const sndBG = new Audio("sounds/music.mp3");
sndBG.loop = true;
sndBG.volume = 0.4; // softer

// Game Over music (plays once)
const sndGameOver = new Audio("sounds/gameover.mp3");



function unlockAudio() {
    
    sndShoot.play().catch(() => {});
    sndEnemyHit.play().catch(() => {});
    sndPlayerHit.play().catch(() => {});
    sndGameOver.play().catch(() => {});
    sndBG.play().catch(() => {});

    sndBG.pause();  // don't actually start yet
    sndShoot.pause();
    sndEnemyHit.pause();
    sndPlayerHit.pause();
    sndGameOver.pause();

    sndBG.isPlaying = false;

    document.removeEventListener("click", unlockAudio);
    document.removeEventListener("touchstart", unlockAudio);
}

document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);





// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;



// Load player sprite
const playerImage = new Image();
playerImage.src = "player.jpg";

// Load enemy sprite
const enemyImage = new Image();
enemyImage.src = "enemy.jpg";

// Pixel art crisp rendering and mobile optimizations
ctx.imageSmoothingEnabled = false;

// Mobile performance optimizations
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (isMobile) {
    // Disable audio on mobile for maximum performance
    sndBG.volume = 0;
    sndShoot.volume = 0;
    sndEnemyHit.volume = 0;
    sndPlayerHit.volume = 0;
    sndGameOver.volume = 0;
    // Disable visual effects for better performance
    canvas.style.filter = 'none';
}



// Game objects and variables
const player = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    width: 50,
    height: 30,
    speed: 12,
    moving: {
        left: false,
        right: false
    },
    lives: 3
};

let bullets = [];
let enemies = [];
let enemyBullets = [];
const enemyRows = 5;
const enemyCols = 10;

let enemyDirection = 1;
let enemySpeed = 1.2;
let enemyDropDistance = 30;
let score = 0;
let level = 1;
let gameIsOver = false;

let explosions = [];

// Touch control variables
let touchLeft = false;
let touchRight = false;

// Bullet firing cooldown
let lastBulletTime = 0;
const bulletCooldown = 150; // 150ms cooldown between bullets

function createEnemies() {
    enemies = [];
    for (let i = 0; i < enemyRows; i++) {
        for (let j = 0; j < enemyCols; j++) {
            enemies.push({
                x: j * 60 + 50,
                y: i * 40 + 50,
                width: 40,
                height: 30
            });
        }
    }
}

createEnemies();

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '20px "Press Start 2P", "VT323", monospace';
    
    // No shadow effects for maximum performance
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Level: ${level}`, canvas.width - 100, 30);
    ctx.fillText(`Lives: ${player.lives}`, 10, canvas.height - 10);
}

function enemyShoot() {
    if (enemies.length > 0 && Math.random() < 0.12) {
        const shooter = enemies[Math.floor(Math.random() * enemies.length)];
        enemyBullets.push({
            x: shooter.x + shooter.width / 2,
            y: shooter.y + shooter.height,
            width: 5,
            height: 10
        });
    }
}

function createExplosion(x, y, isEnemy = false) {
    explosions.push({
        x: x,
        y: y,
        radius: 5,
        maxRadius: 30,
        alpha: 1,
        isEnemy: isEnemy
    });
}

function drawExplosions() {
    // ULTRA-OPTIMIZED explosions - no gradients, no shadows
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        const baseColor = explosion.isEnemy ? '0, 255, 0' : '255, 100, 0';
        
        // Simple circle explosion only
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor}, ${explosion.alpha})`;
        ctx.fill();

        explosion.radius += 2; // Faster explosion
        explosion.alpha -= 0.04; // Faster fade

        if (explosion.radius >= explosion.maxRadius || explosion.alpha <= 0) {
            explosions.splice(i, 1);
        }
    }
}

function checkCollisions() {
    // Player bullets hitting enemies - OPTIMIZED
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];
        let bulletHit = false;
        
        for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
            const enemy = enemies[enemyIndex];
            
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + 5 > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + 10 > enemy.y
            ) {
                createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, true);

                // Reduce audio calls for performance
                if (frameCount % 2 === 0) {
                    sndEnemyHit.currentTime = 0;
                    sndEnemyHit.play();
                }

                bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                score += 10;
                bulletHit = true;
                break; // Exit enemy loop since bullet is destroyed
            }
        }
        
        if (bulletHit) continue; // Skip to next bullet
    }

    // Enemy bullets hitting player - OPTIMIZED
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        
        if (
            bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y
        ) {
            enemyBullets.splice(i, 1);

            sndPlayerHit.currentTime = 0;
            sndPlayerHit.play();

            player.lives--;
            createExplosion(player.x + player.width / 2, player.y + player.height / 2);

            if (player.lives <= 0) {
                gameOver();
            }
            break; // Only one bullet can hit player per frame
        }
    }
}

let nameSubmitted = false;

function gameOver() {
    gameIsOver = true;
    nameSubmitted = false;

    sndBG.pause();  // stop background music

    sndGameOver.currentTime = 0;
    sndGameOver.play(); // 🔊 GAME OVER

    // Show name input form after a short delay
    setTimeout(() => {
        const nameForm = document.getElementById("nameForm");
        const nameInput = document.getElementById("playerNameInput");
        if (nameForm && nameInput) {
            nameForm.classList.add("show");
            nameInput.value = "";
            nameInput.focus();
        }
    }, 500);
}

function submitScore() {
    const nameInput = document.getElementById("playerNameInput");
    const nameForm = document.getElementById("nameForm");
    const playerName = nameInput?.value?.trim();

    if (!playerName) {
        alert("Please enter your name!");
        return;
    }

    if (nameSubmitted) {
        return; // Prevent double submission
    }

    nameSubmitted = true;
    
    // Hide the form
    if (nameForm) {
        nameForm.classList.remove("show");
    }

    // Submit score
    fetch("/api/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: playerName,
            score: score
        })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log("Score submitted successfully:", data);
        // Wait a moment for the data to be saved, then reload leaderboard
        setTimeout(() => {
            loadLeaderboard();
        }, 500);
    })
    .catch(err => {
        console.error("Error submitting score:", err);
        alert("Failed to submit score. Check console for details.");
        nameSubmitted = false; // Allow retry on error
        if (nameForm) {
            nameForm.classList.add("show");
        }
    });
}

// Helper function to draw rounded rectangles
function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // No shadow effects for maximum performance
    ctx.fillStyle = 'white';
    ctx.font = '48px "Press Start 2P", "VT323", monospace';
    ctx.fillText('Game Over', canvas.width / 2 - 180, canvas.height / 2 - 100);

    ctx.font = '24px "Press Start 2P", "VT323", monospace';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2 - 150, canvas.height / 2 - 50);

    // Only show "Play Again" button after name is submitted
    if (nameSubmitted) {
        // Draw rounded button background
        ctx.fillStyle = 'lime';
        drawRoundedRect(canvas.width / 2 - 100, canvas.height / 2 + 40, 250, 40, 10);
        
        ctx.fillStyle = 'black';
        ctx.font = '20px "Press Start 2P", "VT323", monospace';
        ctx.fillText('Play Again', canvas.width / 2 - 70, canvas.height / 2 + 65);
    }
}

function nextLevel() {
    level++;
    enemySpeed += 0.4;
    createEnemies();
    bullets = [];
    enemyBullets = [];
    player.x = canvas.width / 2;
}

function resetGame() {
    player.lives = 3;
    player.x = canvas.width / 2;
    score = 0;
    level = 1;
    enemySpeed = 1.2;
    createEnemies();
    bullets = [];
    enemyBullets = [];
    explosions = [];
    gameIsOver = false;
    nameSubmitted = false;

    // Hide name form if visible
    const nameForm = document.getElementById("nameForm");
    if (nameForm) {
        nameForm.classList.remove("show");
    }

    sndBG.currentTime = 0;
    sndBG.play();
    sndBG.isPlaying = true;
}


// Performance optimization variables
let lastFrameTime = 0;
const targetFPS = isMobile ? 20 : 30; // Even lower FPS for smooth performance
const frameInterval = 1000 / targetFPS;
let frameCount = 0;

function gameLoop(currentTime = 0) {
    // Throttle frame rate for better mobile performance
    if (currentTime - lastFrameTime < frameInterval) {
        requestAnimationFrame(gameLoop);
        return;
    }
    lastFrameTime = currentTime;
    frameCount++;

    // Skip audio check every other frame for performance
    if (frameCount % 2 === 0 && sndBG.paused && !gameIsOver) {
        sndBG.play();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameIsOver) {
        // Update player position
        if ((player.moving.left || touchLeft) && player.x > 0) {
            player.x -= player.speed;
        }
        if ((player.moving.right || touchRight) && player.x < canvas.width - player.width) {
            player.x += player.speed;
        }

        // Draw player
        // Draw player sprite
        // Draw player sprite
        if (playerImage.complete) {
            ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
        } else {
            // fallback while image loads
            ctx.fillStyle = 'green';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }

        // Update and draw bullets - OPTIMIZED
        ctx.fillStyle = 'white';
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.y -= 12;
            ctx.fillRect(bullet.x, bullet.y, 5, 10);
            if (bullet.y < 0) {
                bullets.splice(i, 1);
            }
        }

        // Move and draw enemies - OPTIMIZED
        ctx.fillStyle = 'red';
        let shouldChangeDirection = false;
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            enemy.x += enemySpeed * enemyDirection;
            if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
                shouldChangeDirection = true;
            }
            if (enemyImage.complete) {
                ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
            } else {
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }
        }

        if (shouldChangeDirection) {
            enemyDirection *= -1;
            for (let i = 0; i < enemies.length; i++) {
                enemies[i].y += enemyDropDistance;
            }
        }

        // Enemy shooting - MAXIMUM FREQUENCY
        enemyShoot(); // Shoot every frame!

        // Update and draw enemy bullets - OPTIMIZED
        ctx.fillStyle = 'yellow';
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const bullet = enemyBullets[i];
            bullet.y += 12;
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            if (bullet.y > canvas.height) {
                enemyBullets.splice(i, 1);
            }
        }

        checkCollisions();

        // Check if all enemies are destroyed
        if (enemies.length === 0) {
            nextLevel();
        }

        // Check game over condition - OPTIMIZED
        if (frameCount % 5 === 0) { // Only check every 5th frame
            for (let i = 0; i < enemies.length; i++) {
                if (enemies[i].y + enemies[i].height >= player.y) {
                    gameOver();
                    break;
                }
            }
        }

        drawScore();
        drawExplosions();
    } else {
        drawGameOver();
    }

    requestAnimationFrame(gameLoop);
}

// Event listeners for keyboard controls
document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault(); // Prevent default scrolling behavior
    }
    if (e.key === 'ArrowLeft') player.moving.left = true;
    if (e.key === 'ArrowRight') player.moving.right = true;
   if (e.key === ' ') {
    const currentTime = Date.now();
    if (currentTime - lastBulletTime >= bulletCooldown) {
        bullets.push({
            x: player.x + player.width / 2 - 2.5,
            y: player.y
        });

        sndShoot.currentTime = 0;
        sndShoot.play();  // 🔊 SHOOT SOUND
        
        lastBulletTime = currentTime;
    }
}
});

document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft') player.moving.left = false;
    if (e.key === 'ArrowRight') player.moving.right = false;
});

// Prevent spacebar from scrolling the page
window.addEventListener('keydown', function (e) {
    if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
    }
});

// Touch control event listeners
document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchLeft = true;
});

document.getElementById('leftBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    touchLeft = false;
});

document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchRight = true;
});

document.getElementById('rightBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    touchRight = false;
});

document.getElementById('fireBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    const currentTime = Date.now();
    if (currentTime - lastBulletTime >= bulletCooldown) {
        bullets.push({
            x: player.x + player.width / 2 - 2.5,
            y: player.y
        });

        sndShoot.currentTime = 0;
        sndShoot.play();  // 🔊 SHOOT SOUND
        
        lastBulletTime = currentTime;
    }
});

// Prevent default touch behavior on the canvas
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
});

// Handle canvas click/touch for the "Play Again" button
function handleCanvasClick(e) {
    if (gameIsOver && nameSubmitted) {
        const rect = canvas.getBoundingClientRect();
        const clickX = (e.clientX || e.changedTouches[0].clientX) - rect.left;
        const clickY = (e.clientY || e.changedTouches[0].clientY) - rect.top;

        // Scale the click coordinates to match the canvas internal dimensions
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = clickX * scaleX;
        const y = clickY * scaleY;

        // Check if click/touch is on the "Play Again" button
        if (x >= canvas.width / 2 - 100 && x <= canvas.width / 2 + 150 &&
            y >= canvas.height / 2 + 40 && y <= canvas.height / 2 + 80) {
            resetGame();
        }
    }
}

// Set up form submission handlers (run after DOM is ready)
function setupNameForm() {
    const submitBtn = document.getElementById("submitNameBtn");
    const nameInput = document.getElementById("playerNameInput");

    if (submitBtn) {
        submitBtn.addEventListener('click', submitScore);
    }

    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitScore();
            }
        });
    }
}

// Set up handlers when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNameForm);
} else {
    setupNameForm();
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('touchend', handleCanvasClick);

// Start the game
gameLoop();