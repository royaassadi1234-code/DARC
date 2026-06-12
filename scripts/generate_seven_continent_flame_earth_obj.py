from __future__ import annotations

import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "models"
OBJ_PATH = OUT_DIR / "seven_continent_flame_earth.obj"
MTL_PATH = OUT_DIR / "seven_continent_flame_earth.mtl"
GLOBE_RADIUS = 2.0


MATERIALS = {
    "deep_ocean": (0.025, 0.18, 0.42, 1.0, 0.18, 0.55),
    "ocean_highlight": (0.05, 0.35, 0.62, 1.0, 0.12, 0.48),
    "central_continent": (0.26, 0.54, 0.28, 1.0, 0.08, 0.62),
    "outer_continent": (0.38, 0.60, 0.29, 1.0, 0.08, 0.58),
    "continent_edge": (0.84, 0.66, 0.28, 1.0, 0.55, 0.32),
    "dark_flame": (0.0, 0.0, 0.0, 1.0, 0.05, 0.76),
    "dark_flame_ridge": (0.10, 0.10, 0.09, 1.0, 0.08, 0.68),
    "light_flame": (0.95, 0.92, 0.78, 1.0, 0.10, 0.36),
    "light_flame_core": (1.0, 0.72, 0.26, 1.0, 0.20, 0.28),
    "polar_glow": (0.98, 0.96, 0.84, 1.0, 0.12, 0.30),
}


class MeshWriter:
    def __init__(self) -> None:
        self.vertices: list[tuple[float, float, float]] = []
        self.faces: list[tuple[str, list[int]]] = []

    def add_vertex(self, vertex: tuple[float, float, float]) -> int:
        self.vertices.append(vertex)
        return len(self.vertices)

    def add_face(self, material: str, indices: list[int]) -> None:
        self.faces.append((material, indices))

    def write(self, obj_path: Path, mtl_path: Path) -> None:
        with mtl_path.open("w", encoding="utf-8") as f:
            for name, (r, g, b, alpha, metallic, roughness) in MATERIALS.items():
                f.write(f"newmtl {name}\n")
                f.write(f"Kd {r:.4f} {g:.4f} {b:.4f}\n")
                f.write(f"Ka {r * 0.35:.4f} {g * 0.35:.4f} {b * 0.35:.4f}\n")
                f.write(f"Ks {max(r, 0.04) * 0.35:.4f} {max(g, 0.04) * 0.35:.4f} {max(b, 0.04) * 0.35:.4f}\n")
                f.write(f"Pm {metallic:.4f}\n")
                f.write(f"Pr {roughness:.4f}\n")
                f.write(f"d {alpha:.4f}\n")
                f.write("illum 2\n\n")

        with obj_path.open("w", encoding="utf-8") as f:
            f.write("# Seven-continent flame Earth - generated OBJ\n")
            f.write("# A stylized planet with one central continent, six surrounding continents, dark lower flames, and light upper flames.\n")
            f.write(f"mtllib {mtl_path.name}\n")
            for x, y, z in self.vertices:
                f.write(f"v {x:.5f} {y:.5f} {z:.5f}\n")
            current_material = None
            for material, face in self.faces:
                if material != current_material:
                    f.write(f"usemtl {material}\n")
                    current_material = material
                f.write("f " + " ".join(str(index) for index in face) + "\n")


def normalize(v: tuple[float, float, float]) -> tuple[float, float, float]:
    length = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    if length == 0:
        return (0.0, 0.0, 1.0)
    return (v[0] / length, v[1] / length, v[2] / length)


def cross(a: tuple[float, float, float], b: tuple[float, float, float]) -> tuple[float, float, float]:
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def add(a: tuple[float, float, float], b: tuple[float, float, float]) -> tuple[float, float, float]:
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def mul(v: tuple[float, float, float], scalar: float) -> tuple[float, float, float]:
    return (v[0] * scalar, v[1] * scalar, v[2] * scalar)


def sphere_point(lon_deg: float, lat_deg: float, radius: float = GLOBE_RADIUS) -> tuple[float, float, float]:
    lon = math.radians(lon_deg)
    lat = math.radians(lat_deg)
    return (
        radius * math.cos(lat) * math.sin(lon),
        -radius * math.cos(lat) * math.cos(lon),
        radius * math.sin(lat),
    )


def add_uv_sphere(mesh: MeshWriter, radius: float, material: str, lat_steps: int = 48, lon_steps: int = 96) -> None:
    rows: list[list[int]] = []
    for lat_i in range(lat_steps + 1):
        lat = -90.0 + 180.0 * lat_i / lat_steps
        row = []
        for lon_i in range(lon_steps):
            lon = 360.0 * lon_i / lon_steps
            row.append(mesh.add_vertex(sphere_point(lon, lat, radius)))
        rows.append(row)

    for lat_i in range(lat_steps):
        material_name = "ocean_highlight" if lat_i % 9 == 0 else material
        for lon_i in range(lon_steps):
            mesh.add_face(
                material_name,
                [
                    rows[lat_i][lon_i],
                    rows[lat_i][(lon_i + 1) % lon_steps],
                    rows[lat_i + 1][(lon_i + 1) % lon_steps],
                    rows[lat_i + 1][lon_i],
                ],
            )


def continent_boundary_scale(angle: float, seed: float) -> float:
    return (
        1.0
        + 0.18 * math.sin(angle * 3.0 + seed)
        + 0.10 * math.sin(angle * 5.0 - seed * 0.6)
        + 0.06 * math.cos(angle * 7.0 + seed * 1.3)
    )


def add_continent_patch(
    mesh: MeshWriter,
    lon0: float,
    lat0: float,
    major_deg: float,
    minor_deg: float,
    rotation_deg: float,
    material: str,
    seed: float,
) -> list[tuple[float, float, float]]:
    rings = 8
    segments = 44
    rows: list[list[int]] = [[mesh.add_vertex(sphere_point(lon0, lat0, GLOBE_RADIUS + 0.055))]]
    boundary_points: list[tuple[float, float, float]] = []
    rotation = math.radians(rotation_deg)
    cos_rot, sin_rot = math.cos(rotation), math.sin(rotation)
    cos_lat = max(math.cos(math.radians(lat0)), 0.42)

    for ring_i in range(1, rings + 1):
        t = ring_i / rings
        row = []
        for segment_i in range(segments):
            a = 2 * math.pi * segment_i / segments
            scale = continent_boundary_scale(a, seed)
            east = math.cos(a) * major_deg * scale * t
            north = math.sin(a) * minor_deg * scale * t
            east_rot = east * cos_rot - north * sin_rot
            north_rot = east * sin_rot + north * cos_rot
            lon = lon0 + east_rot / cos_lat
            lat = lat0 + north_rot
            radius = GLOBE_RADIUS + 0.060 + 0.018 * (1.0 - t)
            point = sphere_point(lon, lat, radius)
            row.append(mesh.add_vertex(point))
            if ring_i == rings:
                boundary_points.append(point)
        rows.append(row)

    first_ring = rows[1]
    center = rows[0][0]
    for segment_i in range(segments):
        mesh.add_face(material, [center, first_ring[segment_i], first_ring[(segment_i + 1) % segments]])

    for ring_i in range(1, rings):
        inner = rows[ring_i]
        outer = rows[ring_i + 1]
        for segment_i in range(segments):
            mesh.add_face(
                material,
                [
                    inner[segment_i],
                    inner[(segment_i + 1) % segments],
                    outer[(segment_i + 1) % segments],
                    outer[segment_i],
                ],
            )

    return boundary_points


def add_tube(mesh: MeshWriter, points: list[tuple[float, float, float]], radius: float, material: str, segments: int = 10, closed: bool = False) -> None:
    if closed:
        points = points + [points[0]]
    rings: list[list[int]] = []
    for i, point in enumerate(points):
        previous_point = points[i - 1] if i > 0 else points[0]
        next_point = points[i + 1] if i < len(points) - 1 else points[-1]
        tangent = normalize((next_point[0] - previous_point[0], next_point[1] - previous_point[1], next_point[2] - previous_point[2]))
        outward = normalize(point)
        side = normalize(cross(tangent, outward))
        if side == (0.0, 0.0, 1.0):
            side = (1.0, 0.0, 0.0)
        ring = []
        for segment_i in range(segments):
            a = 2 * math.pi * segment_i / segments
            offset = add(mul(outward, math.cos(a) * radius), mul(side, math.sin(a) * radius))
            ring.append(mesh.add_vertex(add(point, offset)))
        rings.append(ring)

    for i in range(len(points) - 1):
        for segment_i in range(segments):
            mesh.add_face(
                material,
                [
                    rings[i][segment_i],
                    rings[i][(segment_i + 1) % segments],
                    rings[i + 1][(segment_i + 1) % segments],
                    rings[i + 1][segment_i],
                ],
            )


def add_flame_blade(
    mesh: MeshWriter,
    base_angle_deg: float,
    length: float,
    width: float,
    material: str,
    y: float,
    phase: float,
    lean: float = 0.0,
) -> list[tuple[float, float, float]]:
    steps = 18
    left_ids = []
    right_ids = []
    centerline: list[tuple[float, float, float]] = []
    base_angle = math.radians(base_angle_deg)
    for i in range(steps + 1):
        t = i / steps
        angle = base_angle + math.sin(t * math.pi * 3.0 + phase) * 0.10 * (1.0 - t * 0.35) + lean * t
        radial = GLOBE_RADIUS + 0.10 + length * t
        x = radial * math.cos(angle)
        z = radial * math.sin(angle)
        yy = y + 0.08 * math.sin(t * math.pi * 2.0 + phase)
        blade_width = width * (1.0 - t) * (0.82 + 0.20 * math.sin(t * math.pi * 5.0 + phase)) + 0.018
        tangent = (-math.sin(angle), 0.0, math.cos(angle))
        center = (x, yy, z)
        centerline.append(center)
        left_ids.append(mesh.add_vertex(add(center, mul(tangent, blade_width))))
        right_ids.append(mesh.add_vertex(add(center, mul(tangent, -blade_width))))

    for i in range(steps):
        mesh.add_face(material, [left_ids[i], right_ids[i], right_ids[i + 1], left_ids[i + 1]])
    return centerline


def add_arc_ring(mesh: MeshWriter, radius: float, z: float, y: float, material: str, start_deg: float, end_deg: float, tube_radius: float) -> None:
    points = []
    steps = 80
    for i in range(steps + 1):
        t = i / steps
        a = math.radians(start_deg + (end_deg - start_deg) * t)
        points.append((radius * math.cos(a), y, z + radius * math.sin(a) * 0.20))
    add_tube(mesh, points, tube_radius, material, 8, False)


def build() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    mesh = MeshWriter()

    add_uv_sphere(mesh, GLOBE_RADIUS, "deep_ocean")

    continents = [
        (0.0, 0.0, 17.5, 13.0, 12.0, "central_continent", 1.2),
        (0.0, 39.0, 15.0, 10.5, -18.0, "outer_continent", 2.3),
        (37.0, 20.0, 14.0, 10.0, 20.0, "outer_continent", 3.1),
        (36.0, -23.0, 14.5, 10.2, -24.0, "outer_continent", 4.4),
        (0.0, -42.0, 14.0, 9.6, 8.0, "outer_continent", 5.6),
        (-36.0, -22.0, 14.5, 10.0, 24.0, "outer_continent", 6.7),
        (-37.0, 21.0, 14.0, 10.0, -20.0, "outer_continent", 7.8),
    ]
    for continent in continents:
        boundary = add_continent_patch(mesh, *continent)
        add_tube(mesh, boundary, 0.020, "continent_edge", 8, True)

    for lon in (-54, -36, -18, 0, 18, 36, 54):
        points = [sphere_point(lon, lat, GLOBE_RADIUS + 0.025) for lat in range(-64, 65, 8)]
        add_tube(mesh, points, 0.006, "polar_glow", 6, False)

    dark_angles = [198, 214, 230, 246, 262, 278, 294, 310, 326, 342]
    for idx, angle in enumerate(dark_angles):
        strength = 1.0 - abs(angle - 270) / 90.0
        length = 0.90 + max(strength, 0.0) * 0.70
        width = 0.12 + max(strength, 0.0) * 0.10
        centerline = add_flame_blade(mesh, angle, length, width, "dark_flame", -2.08, idx * 0.83, lean=math.radians((270 - angle) * 0.10))
        if idx % 2 == 0:
            add_tube(mesh, centerline, 0.012, "dark_flame_ridge", 6, False)

    light_angles = [22, 38, 55, 72, 90, 108, 125, 142, 158]
    for idx, angle in enumerate(light_angles):
        strength = 1.0 - abs(angle - 90) / 80.0
        length = 0.58 + max(strength, 0.0) * 0.50
        width = 0.075 + max(strength, 0.0) * 0.055
        centerline = add_flame_blade(mesh, angle, length, width, "light_flame", -2.03, idx * 0.71 + 0.4, lean=math.radians((90 - angle) * 0.08))
        if idx % 2 == 1:
            add_tube(mesh, centerline, 0.010, "light_flame_core", 6, False)

    add_arc_ring(mesh, 0.42, 2.42, -2.03, "polar_glow", 0.0, 360.0, 0.010)
    add_arc_ring(mesh, 0.62, -2.62, -2.03, "dark_flame_ridge", 0.0, 360.0, 0.012)

    mesh.write(OBJ_PATH, MTL_PATH)
    print(OBJ_PATH)
    print(MTL_PATH)


if __name__ == "__main__":
    build()
