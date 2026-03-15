# Texture/DDS guidance

- Formats:
  - BC1 (DXT1): diffuse/albedo without alpha.
  - BC3 (DXT5): textures with alpha.
  - BC5 (ATI2): normal maps (R=X, G=Y).
  - BC7: optional higher quality if supported.
- Mipmaps: generate mipmaps on export.
- sRGB: diffuse/albedo in sRGB; normals in linear.
- Converters: nvcompress (NVTT) or texconv (DirectXTex). The add-on auto-picks whichever is configured.
- Naming hints: `_d`, `_albedo` → BC1; `_n` → BC5; `_a`, `_m`, `_mask` → BC3/BC7 as needed.
- Keep source textures organized; ensure paths are accessible for relinking after conversion.
