const getColor = (effect, pixels, index) => {
  const red = Math.min(pixels[index] * effect.config.brightness, 255);
  const green = Math.min(pixels[index + 1] * effect.config.brightness, 255);
  const blue = Math.min(pixels[index + 2] * effect.config.brightness, 255);
  const alpha = pixels[index + 3];

  const color = effect.config.color ?? `rgb(${red}, ${green}, ${blue})`;

  return alpha > 0 ? color : null;
};

window.addEventListener("load", () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  class Particle {
    constructor(effect, x, y, color) {
      this.effect = effect;
      this.x = 0;
      this.y = 0;
      this.originX = Math.floor(x);
      this.originY = Math.floor(y);
      this.color = color;
      this.size = Math.floor(
        this.effect.config.psize * (1 - this.effect.config.gap)
      );
      this.friction = 0.9;
      this.vx = 0;
      this.vy = 0;
      this.ease = this.effect.config.ease * Math.random() + 0.1;
      this.dx = 0;
      this.dy = 0;
      this.distance = 0;
      this.force = 0;
      this.angle = 0;
      this.warp();
    }

    reinit(x, y, color) {
      this.originX = Math.floor(x);
      this.originY = Math.floor(y);
      this.color = color;
    }

    draw(context) {
      context.fillStyle = this.color;
      context.fillRect(this.x, this.y, this.size, this.size);
    }

    update() {
      this.dx = this.effect.mouse.x - this.x;
      this.dy = this.effect.mouse.y - this.y;
      this.distance = this.dx * this.dx + this.dy * this.dy;
      this.force =
        (-10 * this.effect.mouse.radius) / Math.max(this.distance, 10);

      if (this.distance / 8 < this.effect.mouse.radius) {
        this.angle = Math.atan2(this.dy, this.dx);
        this.vx += this.force * Math.cos(this.angle);
        this.vy += this.force * Math.sin(this.angle);
      }

      this.vx *= this.friction;
      this.vy *= this.friction;

      const vibconf = this.effect.config.vibrate;

      if (vibconf && Math.random() < vibconf.chance) {
        if (this.vx < 0.01)
          this.vx += Math.random() * vibconf.velocity - vibconf.velocity / 2;
        if (this.vy < 0.01)
          this.vy += Math.random() * vibconf.velocity - vibconf.velocity / 2;
      }

      this.x += this.vx + (this.originX - this.x) * this.ease;
      this.y += this.vy + (this.originY - this.y) * this.ease;
    }

    warp() {
      this.x = Math.random() * this.effect.width;
      this.y = Math.random() * this.effect.height;
    }
  }

  class Effect {
    constructor(width, height, images, config) {
      const defaultConfig = {
        gap: 0,
        psize: 5,
        color: undefined,
        radius: 20000,
        brightness: 1,
        vibrate: undefined,
        ease: 0.1,
        scale: 1,
      };

      this.config = { ...defaultConfig, ...config };
      this.width = width;
      this.height = height;
      this.particlesArray = [];
      this.images = images;
      this.image = this.images[0];
      this.centerX = this.width * 0.5;
      this.centerY = this.height * 0.5;
      this.calcCenter();

      this.mouse = {
        radius: this.config.radius,
        x: undefined,
        y: undefined,
      };

      window.addEventListener("mousemove", (event) => {
        this.mouse.x = event.x;
        this.mouse.y = event.y;
      });

      window.addEventListener("keydown", (event) => {
        const { x, y } = event;
        this.warp();
      });
    }

    calcCenter() {
      this.x = this.centerX - this.image.width * this.config.scale * 0.5;
      this.y = this.centerY - this.image.height * this.config.scale * 0.5;
    }

    init(context) {
      this.drawImage(context);
      const pixels = context.getImageData(0, 0, this.width, this.height).data;

      for (let y = 0; y < this.height; y += this.config.psize) {
        for (let x = 0; x < this.width; x += this.config.psize) {
          const index = (y * this.width + x) * 4;
          const color = getColor(this, pixels, index);

          if (color) this.particlesArray.push(new Particle(this, x, y, color));
        }
      }
    }

    nextImage() {
      const currImgIdx = this.images.indexOf(this.image);
      const nextImgIdx =
        currImgIdx > this.images.length - 1 ? 0 : currImgIdx + 1;
      this.image = this.images[nextImgIdx];
    }

    drawImage(context) {
      context.drawImage(
        this.image,
        this.x,
        this.y,
        this.image.width * this.config.scale,
        this.image.height * this.config.scale
      );
    }

    switch(context) {
      this.nextImage();
      this.calcCenter();

      ctx.clearRect(0, 0, this.width, this.height);
      this.drawImage(context);

      const pixels = context.getImageData(0, 0, this.width, this.height).data;
      const newParticles = [];

      for (let y = 0; y < this.height; y += this.config.psize) {
        for (let x = 0; x < this.width; x += this.config.psize) {
          const index = (y * this.width + x) * 4;
          const color = getColor(this, pixels, index);

          if (color) {
            const aParticle = this.particlesArray.pop();

            if (aParticle) {
              aParticle.reinit(x, y, color);
              newParticles.push(aParticle);
            } else {
              newParticles.push(new Particle(this, x, y, color));
            }
          }
        }
      }

      this.particlesArray = newParticles;
    }

    draw(context) {
      this.particlesArray.forEach((particle) => particle.draw(context));
    }

    update() {
      this.particlesArray.forEach((particle) => particle.update());
    }

    warp() {
      this.particlesArray.forEach((particle) => particle.warp());
    }
  }

  const effect = new Effect(
    canvas.width,
    canvas.height,
    [document.getElementById("image1"), document.getElementById("image2")],
    {
      psize: 3,
      gap: 0.01,
      radius: Math.max(window.innerWidth, window.innerHeight) * 2,
      brightness: 2,
      scale: 0.7,
      ease: 0.01,
      vibrate: {
        chance: 0.1,
        velocity: 0.2,
      },
    }
  );
  effect.init(ctx);

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    effect.draw(ctx);
    effect.update();
    requestAnimationFrame(animate);
  }

  animate();

  const warpButton = document.getElementById("warp");
  warpButton.addEventListener("click", () => {
    effect.particlesArray.forEach((particle) => {
      particle.originY = effect.height;
    });
  });

  const switchButton = document.getElementById("switch");
  switchButton.addEventListener("click", () => {
    effect.switch(ctx);
  });
});
