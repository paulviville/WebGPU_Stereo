struct Uniforms {
	modelViewProjectionMatrix : mat4x4f,
}

@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
	@builtin(position) Position : vec4f,
	@location(0) fragUV : vec2f,
	@location(1) fragPosition: vec4f,
}

@vertex
fn vertex( @location(0) position : vec4f, @location(1) uv : vec2f ) -> VertexOutput {
	var output : VertexOutput;
	output.Position = uniforms.modelViewProjectionMatrix * (position);
	output.Position -= uniforms.modelViewProjectionMatrix * (vec4(0.0, 0.0, 3.0, 0.0));
	output.fragUV = uv;
	output.fragPosition = 0.5 * (position + vec4(1.0, 1.0, 1.0, 1.0));
	return output;
}

@fragment
fn fragment(
  @location(0) fragUV: vec2f,
  @location(1) fragPosition: vec4f
) -> @location(0) vec4f {
  return fragPosition;
}

