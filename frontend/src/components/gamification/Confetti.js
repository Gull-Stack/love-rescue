/**
 * 🎊 Confetti Animation Component
 * Fires celebration confetti on demand
 */

// Confetti configuration
const defaultColors = ['#FF6B35', '#2D5A27', '#FFD700', '#FF69B4', '#00CED1', '#9370DB'];

class ConfettiParticle {
  constructor(x, y, options = {}) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = (options.startVelocity || 45) * (0.5 + Math.random() * 0.5);
    
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * velocity * ((options.spread || 70) / 70);
    this.vy = Math.sin(angle) * velocity - Math.random() * 10;
    this.color = options.colors?.[Math.floor(Math.random() * options.colors.length)] || 
                 defaultColors[Math.floor(Math.random() * defaultColors.length)];
    this.size = 8 + Math.random() * 8;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
    this.opacity = 1;
  }

  update(gravity, decay) {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += gravity;
    this.vx *= decay;
    this.vy *= decay;
    this.rotation += this.rotationSpeed;
    this.opacity -= 0.01;
    return this.opacity > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    ctx.restore();
  }
}

/**
 * Fire confetti animation
 * @param {Object} options - Configuration options
 */
export function fireConfetti(options = {}) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const particleCount = options.particleCount || 100;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  for (let i = 0; i < particleCount; i++) {
    particles.push(new ConfettiParticle(centerX, centerY, options));
  }

  const gravity = options.gravity || 0.5;
  const decay = options.decay || 0.94;
  const duration = options.duration || 3000;
  const startTime = Date.now();

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
      if (!particles[i].update(gravity, decay)) {
        particles.splice(i, 1);
      } else {
        particles[i].draw(ctx);
      }
    }

    if (particles.length > 0 && Date.now() - startTime < duration) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  animate();
}

// Preset: celebration burst
export function celebration() {
  fireConfetti({
    particleCount: 150,
    spread: 80,
    startVelocity: 50,
    colors: ['#FF6B35', '#2D5A27', '#FFD700', '#FF69B4', '#00CED1'],
  });
}

// Preset: subtle sparkle
export function sparkle() {
  fireConfetti({
    particleCount: 50,
    spread: 50,
    startVelocity: 30,
    gravity: 0.3,
    colors: ['#FFD700', '#FFF8DC', '#FFFACD'],
  });
}

// Preset: love hearts (uses emojis rendered as particles)
export function hearts() {
  fireConfetti({
    particleCount: 60,
    spread: 60,
    startVelocity: 40,
    colors: ['#FF69B4', '#FF1493', '#DC143C', '#FF6B6B'],
  });
}

export default { fireConfetti, celebration, sparkle, hearts };
