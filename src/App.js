const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const width = canvas.width;
const height = canvas.height;

const keys = {};
const SPACE = 32;
const floor = height - 50;
const initialSpeed = 10;
const gravity = 150;

let over = false;
let score = 0;
let speed = initialSpeed;

const player = {
  vy: 0,
  x: 50,
  y: floor
};

let cacti = [500];
let clouds = [];

function reset() {
  cacti = [500];
  clouds = [];
  player.vy = 0;
  player.y = floor;
  score = 0;
  over = false;
  speed = initialSpeed;
}

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
      score++;
      cacti[i] = false;
    }
  }

  cacti = cacti.filter(e => !!e);

  for (let i = 0; i < clouds.length; i++) {
    clouds[i].x -= speed / 2;
  }

  if (Math.random() < 0.05) {
    cacti.push(width + Math.random() * width);
  }

  if (Math.random() < 0.005) {
    clouds.push({
      x: width + Math.random() * 200,
      y: Math.random() * height
    });
  }

  speed += 0.001;
}

function getState() {
  const state = Array(4)
    .fill(0)
    .map((_, i) => (cacti[i] || 0) / width);
  state.push(Math.sign(player.vy));
  return state;
}

const stateCount = getState().length;
window.getState = getState;

const agent = new window.RL.DQNAgent(
  {
    getNumStates() {
      return stateCount;
    },
    getMaxNumActions() {
      return 2;
    }
  },
  {
    // Source: https://github.com/svpino/lunar-lander/
    alpha: 0.001,
    epsilon: 1.0,
    gamma: 0.99
  }
);

let prevScore = 0;
let rewardSum = 0;
let rewardCount = 0;

function getReward() {
  if (over) {
    return -100;
  }
  const reward = Math.sign(score - prevScore) * 0.1;
  prevScore = score;
  return reward;
}

function gameLoop() {
  render();

  const action = agent.act(getState());
  keys[SPACE] = action;

  update();

  const reward = getReward();
  rewardSum += reward;
  rewardCount++;
  agent.learn(reward);

  if (over) {
    console.log(score, rewardSum / rewardCount);
    reset();
    rewardSum = 0;
    rewardCount = 0;
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();

document.addEventListener('keydown', e => (keys[e.which] = true));
document.addEventListener('keyup', e => (keys[e.which] = false));

// let rewardSum = 0;
// let rewardCount = 0;

// function gameLoop() {

//   update(ticks);

//   if (over) {
//     agent.learn(-100);

//     const avg = rewardSum / rewardCount;
//     console.log('Average Reward', avg);
//     rewardSum = 0;
//     rewardCount = 0;
//     rewardsOverTime.pop();
//     rewardsOverTime.unshift(avg);
//     reset();
//   } else {
//     rewardSum += reward;
//     rewardCount++;
//   }
