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
const initialEnergy = 3;
const gravity = 150;
const rewardsOverTime = Array(32 * 3).fill(0);

let over = false;
let score = 0;
let speed = initialSpeed;
let ticks = 0;

const player = {
  vy: 0,
  x: 50,
  y: floor,
  energy: initialEnergy
};

let cacti = [500];
let clouds = [];

function reset() {
  cacti = [500];
  clouds = [];
  player.vy = 0;
  player.y = floor;
  player.energy = initialEnergy;
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
  for (let i = 0; i < player.energy; i++) {
    ctx.fillRect(player.x + (16 + 16) * i, floor + 16, 16, 16);
  }

  const min = Math.min(...rewardsOverTime);
  const max = Math.max(...rewardsOverTime);

  rewardsOverTime.forEach((reward, i) => {
    ctx.fillStyle = reward < 0 ? 'red' : 'green';
    const norm = (reward + min) / (max - min);
    ctx.fillRect(width / 2 + 2 * i, 50, 2, norm * 10);
  });
}

function update() {
  if (over) return;

  if (player.energy && player.vy === 0 && keys[SPACE]) {
    player.vy = -10;
    player.energy--;
  }

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
      cacti[i] = false;
    }
  }

  cacti = cacti.filter(e => !!e);

  for (let i = 0; i < clouds.length; i++) {
    clouds[i].x -= speed / 2;
  }

  if (ticks % 75 === 0) {
    player.energy = Math.min(player.energy + 1, initialEnergy);
  }

  if (ticks % 75 === 0) {
    cacti.push(width + Math.random() * width);
  }

  if (ticks % 200 === 0) {
    clouds.push({
      x: width + Math.random() * 200,
      y: Math.random() * height
    });
  }

  speed += 0.001;
  score++;
}

function getState() {
  const state = Array(4)
    .fill(0)
    .map((_, i) => (cacti[i] || width) / width);
  state.push(player.vy / 10);
  state.push(player.energy / initialEnergy);
  return state;
}

const stateCount = getState().length;
window.getState = getState;

const spec = {};
spec.update = 'qlearn'; // qlearn | sarsa
spec.gamma = 0.9; // discount factor, [0, 1)
spec.epsilon = 0.2; // initial epsilon for epsilon-greedy policy, [0, 1)
spec.alpha = 0.0001; // value function learning rate
spec.experience_add_every = 5; // number of time steps before we add another experience to replay memory
spec.experience_size = 10000; // size of experience
spec.learning_steps_per_iteration = 5;
spec.tderror_clamp = 1.0; // for robustness
spec.num_hidden_units = 100; // number of neurons in hidden layer

const agent = new window.RL.DQNAgent(
  {
    getNumStates() {
      return stateCount;
    },
    getMaxNumActions() {
      return 2;
    }
  },
  spec
);
window.agent = agent;

// age
// agent.expi
// agent.t

const started = Date.now();
window.getAge = () => Date.now() - started;

let prevScore = 0;
let rewardSum = 0;
let rewardCount = 0;

function getReward(hadEnergy) {
  // Reward surviving
  const reward = Math.sign(score - prevScore) * 0.1;
  prevScore = score;
  // Punish losing
  if (over) {
    return -10;
  }
  // Punish wasting energy
  if (hadEnergy && !player.energy && keys[SPACE]) {
    return -10;
  }
  return reward;
}

function gameLoop() {
  render();

  const action = agent.act(getState());
  keys[SPACE] = action;

  const hadEnergy = player.energy > 0;

  update();

  const reward = getReward(hadEnergy);
  rewardSum += reward;
  rewardCount++;
  agent.learn(reward);

  if (over) {
    const avg = rewardSum / rewardCount;
    reset();
    rewardSum = 0;
    rewardCount = 0;
    rewardsOverTime.pop();
    rewardsOverTime.unshift(avg);
  }

  ticks++;
  requestAnimationFrame(gameLoop);
}

gameLoop();

document.addEventListener('keydown', e => (keys[e.which] = true));
document.addEventListener('keyup', e => (keys[e.which] = false));

function save() {
  localStorage.setItem('model', JSON.stringify(agent.toJSON()));
}

function load() {
  const model = localStorage.getItem('model');
  if (model) {
    agent.fromJSON(JSON.parse(model));
  }
}
