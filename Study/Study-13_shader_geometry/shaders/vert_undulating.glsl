// #version 300 es

precision mediump float;

in vec3 position;
in vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float u_time;

out vec2 v_uv;
out vec3 v_position;

void main() {
    v_uv = uv;

    vec3 newPosition = position;

    float wave = sin(u_time + position.x * 3.0) * 0.2;
    wave += sin(u_time * 0.5 + position.y * 2.0) * 0.15;
    wave += cos(u_time * 0.3 + position.z * 2.5) * 0.1;

    newPosition += normalize(position) * wave;
    v_position = newPosition;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);

}