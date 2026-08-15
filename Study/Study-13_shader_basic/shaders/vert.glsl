// #version 300 es

in vec3 position;
in vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float u_time; //시간에 따라 흔들리는 효과를 위해

out vec2 v_uv;

void main() {
    v_uv = uv;

    // Opt 1. 움직이지 않는 판
    // gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    // Opt 2. 3개의 서로 다른 sin 파동을 조합하여 천처럼 흔들리는 효과 생성.
    vec3 pos = position;

    // 시간에 따라 변하는 물결 효과
    float wave1 = sin(pos.x * 6.0 + u_time * 2.0) * 0.1;
    float wave2 = sin(pos.y * 6.0 + u_time * 1.5) * 0.1;
    float wave3 = sin((pos.x + pos.y) * 4.0 + u_time * 2.5) * 0.08;

    // pos.z에 물결값을 더해 높낮이 변화
    pos.z += wave1 + wave2 + wave3;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
