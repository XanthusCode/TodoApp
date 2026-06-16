const COLORS = ['#22d3ee', '#4ade80', '#fbbf24', '#f87171', '#a78bfa', '#fb923c'];

export const launchConfetti = () => {
  for (let i = 0; i < 55; i++) {
    const el       = document.createElement('div');
    const size     = 4 + Math.random() * 7;
    const isCircle = Math.random() > 0.4;
    const duration = 900 + Math.random() * 700;
    const delay    = Math.random() * 350;

    el.style.cssText = [
      'position:fixed', 'z-index:9999', 'pointer-events:none',
      'top:-12px',
      `left:${10 + Math.random() * 80}vw`,
      `width:${size}px`,
      `height:${isCircle ? size : size * 1.6}px`,
      `background:${COLORS[Math.floor(Math.random() * COLORS.length)]}`,
      `border-radius:${isCircle ? '50%' : '2px'}`,
      `animation:confettiFall ${duration}ms ${delay}ms cubic-bezier(0.25,0.46,0.45,0.94) forwards`,
    ].join(';');

    el.style.setProperty('--drift',    `${(Math.random() - 0.5) * 40}vw`);
    el.style.setProperty('--rotation', `${220 + Math.random() * 500}deg`);

    document.body.appendChild(el);
    setTimeout(() => el.remove(), duration + delay + 100);
  }
};
