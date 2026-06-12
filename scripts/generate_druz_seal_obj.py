from __future__ import annotations

import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "models"
OBJ_PATH = OUT_DIR / "druz_fire_altar_resisting_smoke_seal.obj"
MTL_PATH = OUT_DIR / "druz_fire_altar_resisting_smoke_seal.mtl"


MATERIALS = {
    "parchment": (0.93, 0.86, 0.72, 1.0),
    "gold": (0.77, 0.55, 0.20, 1.0),
    "dark_smoke": (0.03, 0.035, 0.035, 1.0),
    "red_branch": (0.46, 0.04, 0.08, 1.0),
    "ember": (0.95, 0.33, 0.08, 1.0),
    "black_portal": (0.0, 0.0, 0.0, 1.0),
}


class MeshWriter:
    def __init__(self) -> None:
        self.vertices: list[tuple[float, float, float]] = []
        self.faces: list[tuple[str, list[int]]] = []

    def add_vertex(self, v: tuple[float, float, float]) -> int:
        self.vertices.append(v)
        return len(self.vertices)

    def add_face(self, material: str, indices: list[int]) -> None:
        self.faces.append((material, indices))

    def write(self, obj_path: Path, mtl_path: Path) -> None:
        with mtl_path.open("w", encoding="utf-8") as f:
            for name, (r, g, b, alpha) in MATERIALS.items():
                f.write(f"newmtl {name}\n")
                f.write(f"Kd {r:.4f} {g:.4f} {b:.4f}\n")
                f.write(f"Ka {r * 0.4:.4f} {g * 0.4:.4f} {b * 0.4:.4f}\n")
                f.write("Ks 0.2500 0.2200 0.1600\n")
                f.write(f"d {alpha:.4f}\n\n")

        with obj_path.open("w", encoding="utf-8") as f:
            f.write("# Druz fire altar resisting smoke seal - generated bas-relief OBJ\n")
            f.write(f"mtllib {mtl_path.name}\n")
            for x, y, z in self.vertices:
                f.write(f"v {x:.5f} {y:.5f} {z:.5f}\n")
            current = None
            for material, indices in self.faces:
                if material != current:
                    f.write(f"usemtl {material}\n")
                    current = material
                f.write("f " + " ".join(str(i) for i in indices) + "\n")


def circle_points(radius: float, segments: int, z: float, scale_y: float = 1.0, cx: float = 0.0, cy: float = 0.0) -> list[tuple[float, float, float]]:
    return [
        (
            cx + radius * math.cos(2 * math.pi * i / segments),
            cy + radius * scale_y * math.sin(2 * math.pi * i / segments),
            z,
        )
        for i in range(segments)
    ]


def add_cylinder(mesh: MeshWriter, radius: float, height: float, z: float, material: str, segments: int = 96, scale_y: float = 1.0, cx: float = 0.0, cy: float = 0.0) -> None:
    bottom = [mesh.add_vertex(p) for p in circle_points(radius, segments, z - height / 2, scale_y, cx, cy)]
    top = [mesh.add_vertex(p) for p in circle_points(radius, segments, z + height / 2, scale_y, cx, cy)]
    center_bottom = mesh.add_vertex((cx, cy, z - height / 2))
    center_top = mesh.add_vertex((cx, cy, z + height / 2))
    for i in range(segments):
        j = (i + 1) % segments
        mesh.add_face(material, [bottom[i], bottom[j], top[j], top[i]])
        mesh.add_face(material, [center_top, top[i], top[j]])
        mesh.add_face(material, [center_bottom, bottom[j], bottom[i]])


def add_annulus(mesh: MeshWriter, inner: float, outer: float, height: float, z: float, material: str, segments: int = 160, cx: float = 0.0, cy: float = 0.0) -> None:
    levels = [z - height / 2, z + height / 2]
    outer_ids = [[mesh.add_vertex(p) for p in circle_points(outer, segments, zz, 1.0, cx, cy)] for zz in levels]
    inner_ids = [[mesh.add_vertex(p) for p in circle_points(inner, segments, zz, 1.0, cx, cy)] for zz in levels]
    for i in range(segments):
        j = (i + 1) % segments
        mesh.add_face(material, [outer_ids[0][i], outer_ids[0][j], outer_ids[1][j], outer_ids[1][i]])
        mesh.add_face(material, [inner_ids[0][j], inner_ids[0][i], inner_ids[1][i], inner_ids[1][j]])
        mesh.add_face(material, [outer_ids[1][i], outer_ids[1][j], inner_ids[1][j], inner_ids[1][i]])
        mesh.add_face(material, [outer_ids[0][j], outer_ids[0][i], inner_ids[0][i], inner_ids[0][j]])


def add_box(mesh: MeshWriter, cx: float, cy: float, cz: float, sx: float, sy: float, sz: float, material: str, angle: float = 0.0) -> None:
    ca, sa = math.cos(angle), math.sin(angle)
    corners = []
    for dx in (-sx / 2, sx / 2):
        for dy in (-sy / 2, sy / 2):
            for dz in (-sz / 2, sz / 2):
                x = cx + dx * ca - dy * sa
                y = cy + dx * sa + dy * ca
                corners.append(mesh.add_vertex((x, y, cz + dz)))
    def c(ix: int, iy: int, iz: int) -> int:
        return corners[ix * 4 + iy * 2 + iz]
    for face in (
        [c(0, 0, 0), c(1, 0, 0), c(1, 1, 0), c(0, 1, 0)],
        [c(0, 0, 1), c(0, 1, 1), c(1, 1, 1), c(1, 0, 1)],
        [c(0, 0, 0), c(0, 0, 1), c(1, 0, 1), c(1, 0, 0)],
        [c(0, 1, 0), c(1, 1, 0), c(1, 1, 1), c(0, 1, 1)],
        [c(0, 0, 0), c(0, 1, 0), c(0, 1, 1), c(0, 0, 1)],
        [c(1, 0, 0), c(1, 0, 1), c(1, 1, 1), c(1, 1, 0)],
    ):
        mesh.add_face(material, face)


def add_uv_sphere(mesh: MeshWriter, cx: float, cy: float, cz: float, radius: float, material: str, rings: int = 8, segments: int = 16) -> None:
    ids: list[list[int]] = []
    for r in range(rings + 1):
        theta = math.pi * r / rings
        row = []
        for s in range(segments):
            phi = 2 * math.pi * s / segments
            row.append(mesh.add_vertex((
                cx + radius * math.sin(theta) * math.cos(phi),
                cy + radius * math.sin(theta) * math.sin(phi),
                cz + radius * math.cos(theta),
            )))
        ids.append(row)
    for r in range(rings):
        for s in range(segments):
            mesh.add_face(material, [ids[r][s], ids[r][(s + 1) % segments], ids[r + 1][(s + 1) % segments], ids[r + 1][s]])


def add_tube(mesh: MeshWriter, points: list[tuple[float, float, float]], radius: float, material: str, segments: int = 10) -> None:
    rings: list[list[int]] = []
    for i, p in enumerate(points):
        if i == 0:
            q = points[1]
        elif i == len(points) - 1:
            q = points[i - 1]
        else:
            q = points[i + 1]
        tx, ty = q[0] - p[0], q[1] - p[1]
        length = max(math.hypot(tx, ty), 0.0001)
        nx, ny = -ty / length, tx / length
        ring = []
        for s in range(segments):
            a = 2 * math.pi * s / segments
            ring.append(mesh.add_vertex((p[0] + radius * math.cos(a) * nx, p[1] + radius * math.cos(a) * ny, p[2] + radius * math.sin(a))))
        rings.append(ring)
    for i in range(len(points) - 1):
        for s in range(segments):
            mesh.add_face(material, [rings[i][s], rings[i][(s + 1) % segments], rings[i + 1][(s + 1) % segments], rings[i + 1][s]])


def radial_point(radius: float, deg: float, z: float = 0.18) -> tuple[float, float, float]:
    a = math.radians(deg)
    return (radius * math.cos(a), radius * math.sin(a), z)


def add_flame(mesh: MeshWriter, x: float, y0: float, height: float, width: float, phase: float, material: str) -> None:
    left = []
    right = []
    steps = 18
    for i in range(steps + 1):
        t = i / steps
        y = y0 + height * t
        center = x + math.sin(t * math.pi * 3 + phase) * width * 0.32
        w = width * (1 - t) * (0.7 + 0.2 * math.sin(t * math.pi * 5 + phase)) + 0.015
        left.append(mesh.add_vertex((center - w, y, 0.30 + 0.20 * t)))
        right.append(mesh.add_vertex((center + w, y, 0.30 + 0.20 * t)))
    for i in range(steps):
        mesh.add_face(material, [left[i], right[i], right[i + 1], left[i + 1]])


def add_branch(mesh: MeshWriter, angle: float, radius0: float, radius1: float, side: float) -> None:
    base = radial_point(radius0, angle, 0.32)
    tip = radial_point(radius1, angle + side * 8, 0.34)
    mid = radial_point((radius0 + radius1) / 2, angle + side * 4, 0.34)
    add_tube(mesh, [base, mid, tip], 0.012, "red_branch", 8)
    for offset in (-15, -7, 8, 16):
        start = radial_point(radius0 + (radius1 - radius0) * 0.45, angle, 0.36)
        end = radial_point(radius1 * 0.95, angle + side * offset, 0.38)
        add_tube(mesh, [start, end], 0.008, "red_branch", 8)
        add_uv_sphere(mesh, end[0], end[1], end[2], 0.045, "red_branch", 6, 12)


def add_smoke_plume(mesh: MeshWriter, angle: float, length: float = 3.2) -> None:
    a = math.radians(angle)
    radial = (math.cos(a), math.sin(a))
    tangent = (-math.sin(a), math.cos(a))
    for lane in (-0.18, 0.0, 0.18):
        pts = []
        for i in range(24):
            t = i / 23
            r = 2.10 + length * t
            wav = math.sin(t * math.pi * 5 + lane * 8) * (0.16 + 0.18 * t)
            x = radial[0] * r + tangent[0] * (lane + wav)
            y = radial[1] * r + tangent[1] * (lane + wav)
            pts.append((x, y, 0.38 + 0.18 * math.sin(t * math.pi)))
        add_tube(mesh, pts, 0.055 + 0.045 * abs(lane), "dark_smoke", 12)


def build() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    mesh = MeshWriter()

    add_cylinder(mesh, 3.2, 0.08, 0.0, "parchment", 192)
    add_annulus(mesh, 2.86, 3.04, 0.12, 0.10, "gold")
    add_annulus(mesh, 1.02, 1.10, 0.16, 0.18, "gold")
    add_cylinder(mesh, 1.00, 0.09, 0.17, "parchment", 128)

    for deg in range(0, 360, 60):
        add_box(mesh, 0, 0, 0.23, 0.035, 5.72, 0.12, "gold", math.radians(deg))

    for deg in range(0, 360, 60):
        add_branch(mesh, deg + 18, 1.25, 2.35, 1)
        add_branch(mesh, deg + 42, 1.25, 2.20, -1)

    add_box(mesh, 0, -0.25, 0.42, 0.70, 0.10, 0.18, "gold")
    add_box(mesh, 0, -0.38, 0.36, 0.52, 0.12, 0.15, "gold")
    add_box(mesh, -0.33, -0.73, 0.34, 0.10, 0.55, 0.12, "gold")
    add_box(mesh, 0.33, -0.73, 0.34, 0.10, 0.55, 0.12, "gold")
    add_box(mesh, 0, -0.98, 0.32, 0.70, 0.10, 0.15, "gold")
    add_box(mesh, -0.58, -0.88, 0.31, 0.32, 0.08, 0.13, "gold")
    add_box(mesh, 0.58, -0.88, 0.31, 0.32, 0.08, 0.13, "gold")
    add_cylinder(mesh, 0.13, 0.18, 0.39, "gold", 32, 0.55, -0.58, -0.74)
    add_cylinder(mesh, 0.13, 0.18, 0.39, "gold", 32, 0.55, 0.58, -0.74)

    for x, phase in [(-0.16, 0.0), (0.0, 1.2), (0.16, 2.1)]:
        add_flame(mesh, x, -0.27, 0.96, 0.13, phase, "gold")
        add_flame(mesh, x * 0.75, -0.22, 0.72, 0.08, phase + 1.4, "ember")

    add_cylinder(mesh, 0.47, 0.14, 0.48, "black_portal", 96, 0.34, 0.0, 1.55)
    add_annulus(mesh, 0.47, 0.54, 0.08, 0.52, "gold", 96, 0.0, 1.55)
    for x, phase in [(-0.10, 0.3), (0.08, 1.5)]:
        add_flame(mesh, x, 1.56, 1.30, 0.09, phase, "gold")

    for angle in (180, 225, 270, 315, 0):
        add_smoke_plume(mesh, angle, 2.2 if angle in (180, 0) else 2.8)

    for deg in range(0, 360, 30):
        p = radial_point(2.72, deg, 0.34)
        add_uv_sphere(mesh, p[0], p[1], p[2], 0.022, "gold", 4, 8)

    add_uv_sphere(mesh, 0, 4.05, 0.52, 0.11, "gold", 8, 16)
    for r in (0.32, 0.56, 0.78):
        add_annulus(mesh, r, r + 0.018, 0.03, 0.42, "gold", 128, 0.0, 4.05)

    mesh.write(OBJ_PATH, MTL_PATH)
    print(OBJ_PATH)
    print(MTL_PATH)


if __name__ == "__main__":
    build()
