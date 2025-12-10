
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

// Pixel art crisp rendering
ctx.imageSmoothingEnabled = false;



// Game objects and variables
const player = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    width: 50,
    height: 30,
    speed: 5,
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
let enemySpeed = 0.5;
let enemyDropDistance = 20;
let score = 0;
let level = 1;
let gameIsOver = false;

let explosions = [];

// Touch control variables
let touchLeft = false;
let touchRight = false;

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
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Level: ${level}`, canvas.width - 100, 30);
    ctx.fillText(`Lives: ${player.lives}`, 10, canvas.height - 10);
}

function enemyShoot() {
    if (enemies.length > 0 && Math.random() < 0.02) {
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
    explosions.forEach((explosion, index) => {
        const baseColor = explosion.isEnemy ? '0, 255, 0' : '255, 100, 0';
        const gradient = ctx.createRadialGradient(
            explosion.x, explosion.y, 0,
            explosion.x, explosion.y, explosion.radius
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${explosion.alpha})`);
        gradient.addColorStop(0.5, `rgba(${baseColor}, ${explosion.alpha})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${explosion.alpha * 0.5})`);

        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowBlur = 20;
        ctx.shadowColor = `rgba(${baseColor}, 0.5)`;

        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor}, ${explosion.alpha * 0.5})`;
        ctx.fill();

        ctx.shadowBlur = 0;

        explosion.radius += 1.5;
        explosion.alpha -= 0.02;

        if (explosion.radius >= explosion.maxRadius || explosion.alpha <= 0) {
            explosions.splice(index, 1);
        }
    });
}

function checkCollisions() {
    // Player bullets hitting enemies
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + 5 > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + 10 > enemy.y
            ) {
                createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, true);

                sndEnemyHit.currentTime = 0;
                sndEnemyHit.play(); // 🔊 ENEMY HIT

                bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                score += 10;

            }
        });
    });

    // Enemy bullets hitting player
    enemyBullets.forEach((bullet, index) => {
        if (
            bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y
        ) {
            enemyBullets.splice(index, 1);

            sndPlayerHit.currentTime = 0;
            sndPlayerHit.play(); // 🔊 PLAYER HIT

            player.lives--;
            createExplosion(player.x + player.width / 2, player.y + player.height / 2);

            if (player.lives <= 0) {
                gameOver();
            }
        }
    });
}

function gameOver() {
    gameIsOver = true;

    sndBG.pause();  // stop background music

    sndGameOver.currentTime = 0;
    sndGameOver.play(); // 🔊 GAME OVER

    setTimeout(() => {
        const playerName = prompt("Enter your name for leaderboard:");

        if (playerName) {
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
            });
        }
    }, 500);

}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '48px "Press Start 2P"';
    ctx.fillText('Game Over', canvas.width / 2 - 180, canvas.height / 2 - 50);

    ctx.font = '24px "Press Start 2P"';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2 - 150, canvas.height / 2 + 10);

    ctx.fillStyle = 'lime';
    ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 40, 250, 40);
    ctx.fillStyle = 'black';
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText('Play Again', canvas.width / 2 - 70, canvas.height / 2 + 65);
}

function nextLevel() {
    level++;
    enemySpeed += 0.2;
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
    enemySpeed = 0.5;
    createEnemies();
    bullets = [];
    enemyBullets = [];
    explosions = [];
    gameIsOver = false;

    sndBG.currentTime = 0;
    sndBG.play();
    sndBG.isPlaying = true;




}


function gameLoop() {


    if (sndBG.paused && !gameIsOver) {
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

        // Update and draw bullets
        ctx.fillStyle = 'white';
        bullets.forEach((bullet, index) => {
            bullet.y -= 7;
            ctx.fillRect(bullet.x, bullet.y, 5, 10);
            if (bullet.y < 0) bullets.splice(index, 1);
        });

        // Move and draw enemies
        ctx.fillStyle = 'red';
        let shouldChangeDirection = false;
        enemies.forEach(enemy => {
            enemy.x += enemySpeed * enemyDirection;
            if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
                shouldChangeDirection = true;
            }
            if (enemyImage.complete) {
                ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
            } else {
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height); // fallback
            }
        });

        if (shouldChangeDirection) {
            enemyDirection *= -1;
            enemies.forEach(enemy => enemy.y += enemyDropDistance);
        }

        // Enemy shooting
        enemyShoot();

        // Update and draw enemy bullets
        ctx.fillStyle = 'yellow';
        enemyBullets.forEach((bullet, index) => {
            bullet.y += 5;
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            if (bullet.y > canvas.height) enemyBullets.splice(index, 1);
        });

        checkCollisions();

        // Check if all enemies are destroyed
        if (enemies.length === 0) {
            nextLevel();
        }

        // Check game over condition
        if (enemies.some(enemy => enemy.y + enemy.height >= player.y)) {
            gameOver();
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
    bullets.push({
        x: player.x + player.width / 2 - 2.5,
        y: player.y
    });

    sndShoot.currentTime = 0;
    sndShoot.play();  // 🔊 SHOOT SOUND
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
    bullets.push({
        x: player.x + player.width / 2 - 2.5,
        y: player.y
    });
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
    if (gameIsOver) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.changedTouches[0].clientX) - rect.left;
        const y = (e.clientY || e.changedTouches[0].clientY) - rect.top;

        // Check if click/touch is on the "Play Again" button
        if (x >= canvas.width / 2 - 60 && x <= canvas.width / 2 + 60 &&
            y >= canvas.height / 2 + 40 && y <= canvas.height / 2 + 80) {
            resetGame();
        }
    }
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('touchend', handleCanvasClick);

// Start the game
gameLoop();