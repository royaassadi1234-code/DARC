"""Create a Blender scene for the seven-continent flame Earth model.

Run from the project root after Blender is installed:
    blender --background --python scripts/create_seven_continent_flame_earth_blender_scene.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
OBJ_PATH = MODEL_DIR / "seven_continent_flame_earth.obj"
BLEND_PATH = MODEL_DIR / "seven_continent_flame_earth.blend"
REFERENCE_PATH = ROOT / "logos" / "druz-logo-fire-altar-resisting-smoke-seal-no-branches-black-white-vector-preview.png"


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
    for material in bpy.data.materials:
        material.use_nodes = True
        bsdf = material.node_tree.nodes.get("Principled BSDF")
        if not bsdf:
            continue
        name = material.name.lower()
        if "ocean" in name:
            bsdf.inputs["Metallic"].default_value = 0.05
            bsdf.inputs["Roughness"].default_value = 0.42
        elif "continent_edge" in name or "core" in name:
            bsdf.inputs["Metallic"].default_value = 0.45
            bsdf.inputs["Roughness"].default_value = 0.30
        elif "flame" in name:
            bsdf.inputs["Roughness"].default_value = 0.72 if "dark" in name else 0.34
        elif "continent" in name:
            bsdf.inputs["Roughness"].default_value = 0.56


def add_reference_plane() -> None:
    if not REFERENCE_PATH.exists():
        return
    material = bpy.data.materials.new("flat_reference_behind_model")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(str(REFERENCE_PATH))
    material.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Alpha"].default_value = 0.18
    material.blend_method = "BLEND"

    bpy.ops.mesh.primitive_plane_add(size=5.9, location=(0, 0.90, 0.0), rotation=(math.radians(90), 0.0, 0.0))
    plane = bpy.context.object
    plane.name = "transparent_reference_image"
    plane.data.materials.append(material)


def add_camera_and_lights() -> None:
    bpy.ops.object.light_add(type="AREA", location=(0, -4.2, 4.2))
    key = bpy.context.object
    key.name = "large_front_softbox"
    key.data.energy = 650
    key.data.size = 4.0

    bpy.ops.object.light_add(type="POINT", location=(0, -2.5, 2.8))
    rim = bpy.context.object
    rim.name = "upper_flame_glow"
    rim.data.energy = 110

    bpy.ops.object.camera_add(location=(0, -7.0, 1.1), rotation=(math.radians(82), 0.0, 0.0))
    camera = bpy.context.object
    bpy.context.scene.camera = camera
    camera.data.lens = 62

    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.samples = 96
    bpy.context.scene.render.resolution_x = 1600
    bpy.context.scene.render.resolution_y = 1600
    bpy.context.scene.view_settings.view_transform = "Filmic"


def main() -> None:
    clear_scene()
    import_obj()
    tune_materials()
    add_reference_plane()
    add_camera_and_lights()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"Saved {BLEND_PATH}")


if __name__ == "__main__":
    main()
