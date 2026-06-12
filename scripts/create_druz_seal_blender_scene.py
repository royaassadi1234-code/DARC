"""Create a Blender scene for the Druz fire-altar smoke seal.

Run in Blender:
    blender --background --python scripts/create_druz_seal_blender_scene.py

The script imports the generated OBJ, adds camera/lights/material tuning, and saves
models/druz_fire_altar_resisting_smoke_seal.blend.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
OBJ_PATH = MODEL_DIR / "druz_fire_altar_resisting_smoke_seal.obj"
BLEND_PATH = MODEL_DIR / "druz_fire_altar_resisting_smoke_seal.blend"
REFERENCE_PATH = ROOT / "logos" / "druz-logo-fire-altar-resisting-smoke-seal.png"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_obj() -> None:
    if not OBJ_PATH.exists():
        raise FileNotFoundError(f"Generate the OBJ first: {OBJ_PATH}")
    if hasattr(bpy.ops.wm, "obj_import"):
        bpy.ops.wm.obj_import(filepath=str(OBJ_PATH))
    else:
        bpy.ops.import_scene.obj(filepath=str(OBJ_PATH))


def tune_materials() -> None:
    for mat in bpy.data.materials:
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if not bsdf:
            continue
        if "gold" in mat.name.lower():
            bsdf.inputs["Metallic"].default_value = 0.65
            bsdf.inputs["Roughness"].default_value = 0.33
        elif "dark_smoke" in mat.name.lower():
            bsdf.inputs["Roughness"].default_value = 0.78
        elif "black_portal" in mat.name.lower():
            bsdf.inputs["Roughness"].default_value = 0.48
        elif "parchment" in mat.name.lower():
            bsdf.inputs["Roughness"].default_value = 0.62


def add_reference_plane() -> None:
    if not REFERENCE_PATH.exists():
        return
    mat = bpy.data.materials.new("original_seal_reference")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(REFERENCE_PATH))
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Alpha"].default_value = 0.28
    mat.blend_method = "BLEND"

    bpy.ops.mesh.primitive_plane_add(size=6.9, location=(0, 0, -0.08))
    plane = bpy.context.object
    plane.name = "transparent_reference_image_plane"
    plane.data.materials.append(mat)


def add_lighting_and_camera() -> None:
    bpy.ops.object.light_add(type="AREA", location=(0, -4.5, 5.5))
    key = bpy.context.object
    key.name = "large_softbox_key_light"
    key.data.energy = 650
    key.data.size = 5.5

    bpy.ops.object.camera_add(location=(0, -7.2, 6.4), rotation=(math.radians(60), 0, 0))
    camera = bpy.context.object
    bpy.context.scene.camera = camera
    camera.data.lens = 58
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 7.0
    camera.data.dof.aperture_fstop = 8.0

    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.samples = 96
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.render.resolution_x = 1600
    bpy.context.scene.render.resolution_y = 1600


def main() -> None:
    MODEL_DIR.mkdir(exist_ok=True)
    clear_scene()
    import_obj()
    tune_materials()
    add_reference_plane()
    add_lighting_and_camera()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"Saved {BLEND_PATH}")


if __name__ == "__main__":
    main()
