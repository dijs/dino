const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const width = canvas.width;
const height = canvas.height;

const keys = {};
const SPACE = 32;
const floor = height - 50;

let over = false;
let score = 0;
let gravity = 100;
let speed = 3;

const player = {
  vy: 0,
  x: 50,
  y: floor
};

let cacti = [500];
let clouds = [];

function text(str, x, y, s = 10) {
  ctx.font = s + 'px serif';
  ctx.fillText(str, x, y);
}

function renderPlayer() {
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  text('🦖', width - player.x * 2, player.y, 50);
  ctx.restore();
}

function renderClouds() {
  clouds.forEach(({ x, y }) => {
    text('☁️', x, y, 100);
  });
}

function renderWorld() {
  // sky
  ctx.fillStyle = '#7ed6df';
  ctx.fillRect(0, 0, width, height);
  renderClouds();
  // floor
  ctx.fillStyle = '#ffbe76';
  ctx.fillRect(0, floor, width, height - floor);
}

function renderCacti() {
  cacti.forEach(x => {
    text('🌵', x, floor, 30);
  });
}

function render() {
  renderWorld();
  renderPlayer();
  renderCacti();
  ctx.fillStyle = 'black';
  text('' + score, width - 100, 30, 20);
}

function update() {
  if (over) return;

  if (player.vy === 0 && keys[SPACE]) player.vy = -10;
  player.vy += (gravity * 0.1 ** 2) / 2;
  player.y += player.vy;

  if (player.y > floor) {
    player.y = floor;
    player.vy = 0;
  }

  for (let i = 0; i < cacti.length; i++) {
    cacti[i] -= speed;
    const dist = Math.hypot(player.x - cacti[i], player.y - floor);
    if (dist < 10) {
      over = true;
      return;
    }
    if (cacti[i] < -10) {
      cacti.shift();
    }
  }

  for (let i = 0; i < clouds.length; i++) {
    clouds[i].x -= speed / 2;
  }

  if (Math.random() < 0.01) {
    cacti.push(width + Math.random() * width);
  }

  if (Math.random() < 0.005) {
    clouds.push({
      x: width + Math.random() * 200,
      y: Math.random() * height
    });
  }

  speed += 0.001;
  score++;
}

function gameLoop() {
  render();
  update();
  requestAnimationFrame(gameLoop);
}

gameLoop();

document.addEventListener('keydown', e => (keys[e.which] = true));
document.addEventListener('keyup', e => (keys[e.which] = false));
