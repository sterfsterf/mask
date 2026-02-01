// Shared post-processing configuration
export const POST_PROCESSING_CONFIG = {
  mode: 'pixelation', // 'pixelation' | 'halftone' | 'none'
  pixelSize: 3.84,
  halftoneSize: 4.0
};

export const PixelShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'resolution': { value: null }, // Will be set per scene
    'pixelSize': { value: POST_PROCESSING_CONFIG.pixelSize }
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

export const HalftoneShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'resolution': { value: null },
    'dotSize': { value: POST_PROCESSING_CONFIG.halftoneSize }
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
    uniform float dotSize;
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv * resolution / dotSize;
      vec2 gridPos = fract(uv);
      float dist = length(gridPos - 0.5);
      
      vec4 color = texture2D(tDiffuse, vUv);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      
      float threshold = 0.5 - gray * 0.8;
      float dot = smoothstep(threshold, threshold + 0.1, 0.5 - dist);
      
      gl_FragColor = vec4(vec3(dot), 1.0);
    }
  `
};
