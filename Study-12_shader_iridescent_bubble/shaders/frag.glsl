// shaders/frag.glsl
precision highp float;

// [Linter 전용 선언 블록] vert.glsl과 동일한 원리 (하단 설명 참고)
#ifndef THREE_RUNTIME
uniform vec3 cameraPosition;
#endif

uniform float uTime;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vReflect;

vec3 iridescence(float cosine, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * cosine + d));
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);

    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);

    vec3 iriColor = iridescence(fresnel + uTime * 0.15, a, b, c, d);

    vec3 refDir = normalize(vReflect);
    float light1 = pow(max(dot(refDir, normalize(vec3(0.5, 1.0, 0.5))), 0.0), 30.0);
    float light2 = pow(max(dot(refDir, normalize(vec3(-1.0, 0.5, -1.0))), 0.0), 15.0);

    vec3 specularLights = vec3(light1 * 1.8) + vec3(light2 * 1.0);

    vec3 baseMetal = vec3(0.85, 0.88, 0.8);

    vec3 finalColor = mix(baseMetal, iriColor, fresnel * 0.9);
    finalColor += specularLights;

    gl_FragColor = vec4(finalColor, 1.0);
}