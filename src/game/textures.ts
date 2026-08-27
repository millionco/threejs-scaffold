import * as THREE from "three";

function canvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** vertical blue wall paneling */
export function panelingTexture(repeatX: number, repeatY = 1): THREE.CanvasTexture {
  const tex = canvasTexture(128, (ctx) => {
    ctx.fillStyle = "#4d76a8";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#456b9a";
    for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 3, 128);
    ctx.fillStyle = "#547fb3";
    for (let x = 4; x < 128; x += 32) ctx.fillRect(x, 0, 2, 128);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

/** cream wallpaper with blue X motifs (backsplash) */
export function wallpaperTexture(repeatX: number, repeatY = 1): THREE.CanvasTexture {
  const tex = canvasTexture(128, (ctx) => {
    ctx.fillStyle = "#e9e4d6";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#5f8fc0";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    const draw = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r);
      ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r);
      ctx.lineTo(cx - r, cy + r);
      ctx.stroke();
    };
    draw(32, 32, 11);
    draw(96, 96, 11);
    draw(96, 32, 7);
    draw(32, 96, 7);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

/** brown goo drip with alpha, running downward from the top edge */
export function dripTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = "#5e3f2c";
    ctx.fillRect(0, 0, 256, 26);
    const runs = [
      { x: 24, len: 150, w: 26 },
      { x: 74, len: 90, w: 20 },
      { x: 122, len: 200, w: 30 },
      { x: 178, len: 70, w: 18 },
      { x: 224, len: 120, w: 22 },
    ];
    for (const r of runs) {
      ctx.beginPath();
      ctx.moveTo(r.x - r.w / 2, 0);
      ctx.lineTo(r.x - r.w / 2, r.len * 0.75);
      ctx.quadraticCurveTo(r.x - r.w / 2, r.len, r.x, r.len);
      ctx.quadraticCurveTo(r.x + r.w / 2, r.len, r.x + r.w / 2, r.len * 0.75);
      ctx.lineTo(r.x + r.w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r.x, r.len, r.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** wood plank floor */
export function floorTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const tex = canvasTexture(256, (ctx) => {
    ctx.fillStyle = "#a06e48";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#8d5f3e";
    for (let y = 0; y < 256; y += 64) ctx.fillRect(0, y, 256, 4);
    ctx.fillStyle = "#96663f";
    for (let i = 0; i < 4; i++) {
      const y = i * 64;
      ctx.fillRect(((i * 96) % 256) - 2, y, 4, 64);
    }
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let y = 6; y < 256; y += 64) ctx.fillRect(0, y, 256, 2);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}
