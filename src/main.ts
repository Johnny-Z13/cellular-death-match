const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('No 2D context');

ctx.fillStyle = '#0f0';
ctx.fillRect(10, 10, 50, 50);
