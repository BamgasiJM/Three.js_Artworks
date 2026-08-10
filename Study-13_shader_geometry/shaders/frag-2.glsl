// #version 300 es

precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

in vec2 v_uv;
in vec3 v_position;

out vec4 outColor;

void main() {
    vec2 uv = v_uv;

    // 가로 세로 그리드 수치 조절
    float gridX = 15.0;
    float gridY = 15.0;

    vec2 gridUv = mod(uv * vec2(gridX, gridY), 1.0);
    vec2 gridId = floor(uv * vec2(gridX, gridY));

    float cellSizeX = 1.0 / gridX;
    float cellSizeY = 1.0 / gridY;

    float cellCenterX = gridId.x * cellSizeX + cellSizeX * 0.5;
    float cellCenterY = gridId.y * cellSizeY + cellSizeY * 0.5;

    vec2 cellCenter = vec2(cellCenterX, cellCenterY);
    vec2 distToCenter = uv - cellCenter;
    float distFromCenter = length(distToCenter);

    float maxRadiusX = cellSizeX * 0.35;
    float maxRadiusY = cellSizeY * 0.35;
    float maxRadius = min(maxRadiusX, maxRadiusY);
    float animatedRadius = maxRadius * (0.5 + 0.5 * sin(u_time + gridId.x * 0.1 + gridId.y * 0.1));

    float circle = smoothstep(animatedRadius + 0.01, animatedRadius - 0.01, distFromCenter);

    vec3 bgColor = vec3(0.1);
    vec3 circleColor = vec3(1.0, 1.0, 1.0);

    vec3 finalColor = mix(bgColor, circleColor, circle);

    outColor = vec4(finalColor, 1.0);
}
