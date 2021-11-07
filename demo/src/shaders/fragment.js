export default `
  precision highp float;

  uniform vec3 uColor;
  varying vec3 vNormal;

  void main() {
    vec3 normal = normalize(vNormal);
    float lighting = dot(normal, normalize(vec3(10)));

    gl_FragColor.rgb = uColor + lighting * 0.1;
    gl_FragColor.a = 1.0;
  }
`
