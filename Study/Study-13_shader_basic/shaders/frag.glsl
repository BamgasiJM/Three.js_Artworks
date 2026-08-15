// #version 300 es

precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

in vec2 v_uv;

out vec4 outColor;

void main() {
    vec2 uv = v_uv;

    float r = 0.5 + 0.5 * sin(u_time + uv.x * 3.141592);
    float g = 0.5 + 0.5 * sin(u_time + uv.y * 3.141592);
    float b = 0.5 + 0.5 * sin(u_time);

    outColor = vec4(r, g, b, 1.0);
}
