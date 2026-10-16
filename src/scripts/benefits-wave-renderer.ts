// Ribbon surface and lighting from MyPerol_Onda_Blanca.html.
const vertexSource = `
  precision highp float;
  attribute vec2 aUV;
  uniform float uTime;
  uniform float uAspect;
  uniform mediump vec2 uPointer;
  varying mediump vec3 vNormal;
  varying mediump vec3 vPosition;
  varying mediump vec2 vUV;
  vec3 surface(vec2 uv) {
    float x=(uv.x-.5)*13.7;
    float t=uTime*.16;
    float phase=x*.63+t;
    float center=.93*sin(phase)+.12*sin(x*1.14-t*.6);
    float twist=.42+.72*sin(x*.49-t*.65+.7);
    float v=uv.y;
    float breadth=.78+.1*cos(phase+.8);
    float y=center+v*breadth*cos(twist);
    float z=.44*cos(x*.52+t*.7)+v*breadth*sin(twist)+.19*(1.-v*v);
    y+=.07*cos(v*3.14159+x*.3+t)*v*v;
    y+=uPointer.y*.10;
    z+=uPointer.x*x*.016;
    return vec3(x,y,z);
  }
  void main() {
    vec3 p=surface(aUV);
    vec3 du=surface(aUV+vec2(.0005,0.))-surface(aUV-vec2(.0005,0.));
    vec3 dv=surface(aUV+vec2(0.,.0005))-surface(aUV-vec2(0.,.0005));
    vNormal=normalize(cross(du,dv));
    vPosition=p;
    vUV=aUV;
    float perspective=8.5/(8.5-p.z);
    float yScale=mix(.39,.60,clamp((uAspect-1.)/2.,0.,1.));
    gl_Position=vec4(p.x/5.9*perspective,p.y*yScale*perspective,-p.z*.12,1.);
  }
`;

const fragmentSource = `
  precision mediump float;
  varying mediump vec3 vNormal;
  varying mediump vec3 vPosition;
  varying mediump vec2 vUV;
  uniform mediump vec2 uPointer;
  float studio(vec3 r, vec3 dir, float power) {
    return pow(max(dot(r,normalize(dir)),0.),power);
  }
  void main() {
    vec3 n=normalize(vNormal);
    if(!gl_FrontFacing) n=-n;
    vec3 view=normalize(vec3(0.,0.,8.5)-vPosition);
    if(dot(n,view)<0.) n=-n;
    vec3 reflection=reflect(-view,n);
    float broad=studio(reflection,vec3(-.25,.9,1.),5.);
    float top=studio(reflection,vec3(-.45+uPointer.x*.16,1.3,1.),44.);
    float stripe=studio(reflection,vec3(.65,-.8,1.),28.);
    float side=studio(reflection,vec3(1.5,.1,.55),32.);
    float fresnel=pow(1.-max(dot(n,view),0.),3.);
    vec3 base=vec3(.095,.108,.105);
    vec3 col=base+vec3(.30,.30,.28)*broad;
    col+=vec3(.73,.70,.62)*top*.87;
    col+=vec3(.44,.48,.48)*stripe*.43;
    col+=vec3(.40,.39,.34)*side*.55;
    col+=vec3(.25,.26,.25)*fresnel;
    float edge=smoothstep(.94,1.,abs(vUV.y));
    col+=vec3(.32,.30,.25)*edge*(.18+broad*.7);
    col=pow(col,vec3(.83));
    gl_FragColor=vec4(col,.94);
  }
`;

export function createBenefitsWaveRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true, antialias: true, premultipliedAlpha: false,
    powerPreference: "low-power", preserveDrawingBuffer: false,
  });
  if (!gl) throw new Error("WebGL unavailable");

  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const verticesBuffer = gl.createBuffer();
  const indicesBuffer = gl.createBuffer();
  function dispose() {
    shaders.forEach(shader => gl!.deleteShader(shader));
    gl!.deleteBuffer(verticesBuffer);
    gl!.deleteBuffer(indicesBuffer);
    gl!.deleteProgram(program);
  }

  try {
    if (!program || !verticesBuffer || !indicesBuffer) throw new Error("Unable to allocate wave resources");
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Unable to allocate wave shader");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Wave shader compilation failed");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Wave shader link failed");
    gl.useProgram(program);

    const widthSegments = 240;
    const heightSegments = 28;
    const vertices = new Float32Array((widthSegments + 1) * (heightSegments + 1) * 2);
    const indices = new Uint16Array(widthSegments * heightSegments * 6);
    let offset = 0;
    for (let x = 0; x <= widthSegments; x++) {
      for (let y = 0; y <= heightSegments; y++) {
        vertices[offset++] = x / widthSegments;
        vertices[offset++] = y / heightSegments * 2 - 1;
      }
    }
    offset = 0;
    for (let x = 0; x < widthSegments; x++) {
      for (let y = 0; y < heightSegments; y++) {
        const a = x * (heightSegments + 1) + y;
        const b = a + heightSegments + 1;
        indices.set([a, b, a + 1, b, b + 1, a + 1], offset);
        offset += 6;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "aUV");
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const aspectLocation = gl.getUniformLocation(program, "uAspect");
    const pointerLocation = gl.getUniformLocation(program, "uPointer");
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    return {
      draw(time: number, pointerX: number, pointerY: number) {
        if (gl.isContextLost()) return;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform1f(timeLocation, time);
        gl.uniform1f(aspectLocation, canvas.width / canvas.height);
        gl.uniform2f(pointerLocation, pointerX, pointerY);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
