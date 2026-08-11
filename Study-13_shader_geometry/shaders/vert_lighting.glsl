// #version 300 es

precision mediump float;

in vec3 position;
in vec3 normal;
in vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 modelMatrix;
uniform mat3 normalMatrix;
uniform float u_time;

out vec2 v_uv;
out vec3 v_position;
out vec3 v_normal;
out vec3 v_worldPosition;

// --- Static Geometry ---
// void main() {
//     v_uv = uv;
//     v_position = position;
//     v_normal = normalize(normalMatrix * normal);
//     v_worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
//     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
// }

// --- Animated Wavy Geometry ---
void main() {
    v_uv = uv;

    float wave = sin(u_time + position.x * 3.0) * 0.1;
    wave += sin(u_time * 0.5 + position.y * 2.0) * 0.25;
    wave += cos(u_time * 0.3 + position.z * 12.5) * 0.15;

    vec3 animatedPosition = position + normalize(position) * wave;

    v_position = position;
    v_normal = normalize(normalMatrix * normal);
    v_worldPosition = (modelMatrix * vec4(animatedPosition, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPosition, 1.0);
}
