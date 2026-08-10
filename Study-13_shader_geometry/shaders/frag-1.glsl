// #version 300 es

precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

in vec2 v_uv;
in vec3 v_position;

out vec4 outColor;

void main() {
    vec2 uv = v_uv;
    vec3 pos = v_position;

    float r = 0.1 + 0.5 * sin(u_time + uv.x *  6.28318 + pos.x * 2.0);
    float g = 0.7 + 0.5 * sin(u_time * 0.8 + uv.y * 6.28318 + pos.y * 2.0);
    float b = 0.8 + 0.5 * sin(u_time * 0.6 + (uv.x + uv.y) * 6.28318 + pos.z * 2.0);

    float brightness = 0.6 + 0.4 * abs(sin(u_time * 0.5));

    outColor = vec4(r * brightness, g * brightness, b * brightness, 1.0);
}
