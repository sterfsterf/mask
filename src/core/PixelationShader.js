// Shared pixelation shader configuration
export const PIXELATION_CONFIG = {
  pixelSize: 3.84
};

export const PixelShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'resolution': { value: null }, // Will be set per scene
    'pixelSize': { value: PIXELATION_CONFIG.pixelSize }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelSize;
    varying vec2 vUv;
    
    void main() {
      vec2 dxy = pixelSize / resolution;
      vec2 coord = dxy * floor(vUv / dxy);
      gl_FragColor = texture2D(tDiffuse, coord);
    }
  `
};
