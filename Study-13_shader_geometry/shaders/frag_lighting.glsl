precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 cameraPosition;

uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform vec3 u_ambient;
uniform float u_shininess;
uniform float u_specStrength;

in vec2 v_uv;
in vec3 v_position;
in vec3 v_normal;
in vec3 v_worldPosition;

out vec4 outColor;

void main() {
    vec3 normal = normalize(v_normal);
    vec3 viewDir = normalize(cameraPosition - v_worldPosition);
    vec3 lightDir = normalize(u_lightDir);
    vec3 halfDir = normalize(lightDir + viewDir);

    float diff = max(dot(normal, lightDir), 0.0);
    float spec = pow(max(dot(normal, halfDir), 0.0), u_shininess);

    vec3 baseColor = vec3(0.15, 0.15, 0.15);

    vec3 ambient = u_ambient * baseColor;
    vec3 diffuse = u_lightColor * diff * baseColor;
    vec3 specular = u_lightColor * spec * u_specStrength;

    vec3 finalColor = ambient + diffuse + specular;

    outColor = vec4(finalColor, 1.0);
}
